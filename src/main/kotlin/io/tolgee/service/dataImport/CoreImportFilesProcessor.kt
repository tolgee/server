package io.tolgee.service.dataImport

import io.tolgee.dtos.dataImport.ImportFileDto
import io.tolgee.dtos.dataImport.ImportStreamingProgressMessageType
import io.tolgee.dtos.dataImport.ImportStreamingProgressMessageType.FOUND_ARCHIVE
import io.tolgee.dtos.dataImport.ImportStreamingProgressMessageType.FOUND_FILES_IN_ARCHIVE
import io.tolgee.exceptions.FileIssueException
import io.tolgee.model.Language
import io.tolgee.model.dataImport.*
import io.tolgee.model.dataImport.issues.ImportFileIssue
import io.tolgee.model.dataImport.issues.issueTypes.FileIssueType
import io.tolgee.model.dataImport.issues.issueTypes.TranslationIssueType.MULTIPLE_VALUES_FOR_KEY_AND_LANGUAGE
import io.tolgee.model.dataImport.issues.paramTypes.TranslationIssueParamType.KEY_ID
import io.tolgee.model.dataImport.issues.paramTypes.TranslationIssueParamType.LANGUAGE_ID
import io.tolgee.service.LanguageService
import io.tolgee.service.dataImport.processors.*
import org.springframework.context.ApplicationContext
import java.net.FileNameMap
import java.net.URLConnection


class CoreImportFilesProcessor(
        val applicationContext: ApplicationContext,
        val import: Import
) {
    private val storedKeys by lazy {
        importService.findKeys(import).asSequence().map { it.name to it }.toMap(mutableMapOf())
    }

    private val storedLanguages by lazy {
        importService.findLanguages(import)
    }

    val storedTranslations = mutableMapOf<ImportLanguage, MutableMap<ImportKey, MutableList<ImportTranslation>>>()
    private val importService: ImportService by lazy { applicationContext.getBean(ImportService::class.java) }
    private val languageService: LanguageService by lazy { applicationContext.getBean(LanguageService::class.java) }

    fun processFiles(files: List<ImportFileDto>?,
                     messageClient: (ImportStreamingProgressMessageType, List<Any>?) -> Unit) {
        files?.forEach {
            processFileOrArchive(it, messageClient)
        }
    }

    private fun processFileOrArchive(file: ImportFileDto,
                                     messageClient: (ImportStreamingProgressMessageType, List<Any>?) -> Unit) {
        try {
            val mimeType = file.getContentMimeType()

            if (isArchive(mimeType)) {
                messageClient(FOUND_ARCHIVE, null)
                file.saveArchiveEntity()
                val processor = getArchiveProcessorByMimeType(mimeType)
                processor.process(file).apply {
                    messageClient(FOUND_FILES_IN_ARCHIVE, listOf(size))
                    processFiles(this, messageClient)
                }
                return
            }

            val savedFileEntity = file.saveFileEntity()
            val fileProcessorContext = FileProcessorContext(file, savedFileEntity, messageClient)
            val processor = getProcessorByMimeType(mimeType, fileProcessorContext)
            processor.process()
            processor.context.processResult()
        } catch (e: FileIssueException) {
            file.saveFileEntity().let { fileEntity ->
                importService.saveFileIssue(ImportFileIssue(file = fileEntity, type = e.type))
            }
        }
    }

    private fun ImportFileDto.saveFileEntity() = importService.saveFile(ImportFile(this.name, import))

    private fun ImportFileDto.saveArchiveEntity() = importService.saveArchive(ImportArchive(this.name!!, import))

    private fun getArchiveProcessorByMimeType(type: String): ImportArchiveProcessor {
        return when (type) {
            "application/zip" -> ZipTypeProcessor()
            else -> throw FileIssueException(FileIssueType.NO_MATCHING_PROCESSOR)
        }
    }

    private fun getProcessorByMimeType(type: String, context: FileProcessorContext): ImportFileProcessor {
        return when (type) {
            "application/json" -> JsonFileProcessor(context)
            else -> throw FileIssueException(FileIssueType.NO_MATCHING_PROCESSOR)
        }
    }

    private fun isArchive(mimeType: String) = mimeType == "application/zip"

    private fun ImportFileDto.getContentMimeType(): String {
        this.name?.let { filename ->
            if (filename.endsWith(".json")) {
                return "application/json"
            }
            val fileNameMap: FileNameMap = URLConnection.getFileNameMap()
            return fileNameMap.getContentTypeFor(filename)
                    ?: throw FileIssueException(FileIssueType.NO_MATCHING_PROCESSOR)
        } ?: throw FileIssueException(FileIssueType.NO_FILENAME_PROVIDED)
    }

    private fun FileProcessorContext.processResult() {
        this.processLanguages()
        this.processTranslations()
    }

    private fun FileProcessorContext.processLanguages() {
        this.languages.forEach { entry ->
            val languageEntity = entry.value
            val matchingStoredLanguage = storedLanguages.find {
                it.name == entry.value.name && it.existingLanguage != null
            }
            if (matchingStoredLanguage == null) {
                languageEntity.existingLanguage = languageEntity.findMatchingExisting()
            }
            importService.saveLanguages(this.languages.values)
        }
    }

    /**
     * Returns list of translations provided for a language and a key.
     * It returns collection since translations could collide, when an user uploads multiple files with different values
     * for a key
     */
    private fun getStoredTranslations(key: ImportKey, language: ImportLanguage): MutableList<ImportTranslation> {
        populateStoredTranslations(language)
        val languageData = storedTranslations[language]!!

        return languageData[key] ?: let {
            languageData[key] = mutableListOf()
            languageData[key]!!
        }
    }

    private fun addToStoredTranslations(translation: ImportTranslation) {
        storedTranslations[translation.language]!!.let { it[translation.key]!!.add(translation) }
    }

    private fun saveAllStoredTranslations() {
        storedTranslations.values.asSequence().flatMap { it.values }.flatMap { it }.toList().let {
            importService.saveTranslations(it)
        }
    }

    private fun populateStoredTranslations(language: ImportLanguage) {
        if (this.storedTranslations[language] != null) {
            return //it is already there
        }

        val languageData = mutableMapOf<ImportKey, MutableList<ImportTranslation>>()
        storedTranslations[language] = languageData
        importService.findTranslations(import, language.id).forEach { importTranslation ->
            val keyTranslations = languageData[importTranslation.key] ?: let {
                languageData[importTranslation.key] = mutableListOf()
                languageData[importTranslation.key]!!
            }
            keyTranslations.add(importTranslation)
        }
    }

    private fun FileProcessorContext.getOrCreateKey(name: String): ImportKey {
        var entity = storedKeys[name]
        if (entity == null) {
            entity = ImportKey(name = name)
            storedKeys[name] = entity
        }

        if (!entity.files.any { this.fileEntity == it }) {
            entity.files.add(fileEntity)
            fileEntity.keys.add(entity)
        }

        return entity
    }

    private fun ImportLanguage.findMatchingExisting(): Language? {
        return languageService.findByAbbreviation(this.name, import.repository.id).orElse(null)
    }

    private fun FileProcessorContext.processTranslations() {
        this.translations.forEach { entry ->
            val keyEntity = getOrCreateKey(entry.key)
            entry.value.forEach { newTranslation ->
                newTranslation.key = keyEntity
                val existingTranslations = getStoredTranslations(keyEntity, newTranslation.language)
                if (existingTranslations.size > 1) {
                    existingTranslations.forEach { collidingTranslations ->
                        collidingTranslations.addIssue(MULTIPLE_VALUES_FOR_KEY_AND_LANGUAGE,
                                mapOf(
                                        KEY_ID to collidingTranslations.key.id.toString(),
                                        LANGUAGE_ID to collidingTranslations.language.id.toString()
                                )
                        )
                    }
                }
                this@CoreImportFilesProcessor.addToStoredTranslations(newTranslation)
            }
        }
        this@CoreImportFilesProcessor.saveAllStoredTranslations()
    }
}