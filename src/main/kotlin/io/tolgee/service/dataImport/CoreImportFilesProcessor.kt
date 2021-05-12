package io.tolgee.service.dataImport

import io.tolgee.dtos.dataImport.ImportFileDto
import io.tolgee.dtos.dataImport.ImportStreamingProgressMessageType
import io.tolgee.dtos.dataImport.ImportStreamingProgressMessageType.*
import io.tolgee.exceptions.FileIssueException
import io.tolgee.model.Language
import io.tolgee.model.dataImport.*
import io.tolgee.model.dataImport.issues.ImportFileIssue
import io.tolgee.model.dataImport.issues.issueTypes.FileIssueType
import io.tolgee.model.dataImport.issues.paramTypes.FileIssueParamType
import io.tolgee.service.LanguageService
import io.tolgee.service.dataImport.processors.FileProcessorContext
import io.tolgee.service.dataImport.processors.ProcessorFactory
import org.springframework.context.ApplicationContext
import java.net.FileNameMap
import java.net.URLConnection


class CoreImportFilesProcessor(
        val applicationContext: ApplicationContext,
        val import: Import
) {
    private val importService: ImportService by lazy { applicationContext.getBean(ImportService::class.java) }
    private val languageService: LanguageService by lazy { applicationContext.getBean(LanguageService::class.java) }
    private val processorFactory: ProcessorFactory by lazy { applicationContext.getBean(ProcessorFactory::class.java) }
    private val importDataManager = ImportDataManager(applicationContext, import)

    fun processFiles(files: List<ImportFileDto>?,
                     messageClient: (ImportStreamingProgressMessageType, List<Any>?) -> Unit) {
        files?.forEach {
            processFileOrArchive(it, messageClient)
        }
    }

    private fun processFileOrArchive(file: ImportFileDto,
                                     messageClient: (ImportStreamingProgressMessageType, List<Any>?) -> Unit) {
        try {
            if (file.isArchive) {
                messageClient(FOUND_ARCHIVE, null)
                file.saveArchiveEntity()
                val processor = processorFactory.getArchiveProcessor(file)
                processor.process(file).apply {
                    messageClient(FOUND_FILES_IN_ARCHIVE, listOf(size))
                    processFiles(this, messageClient)
                }
                return
            }

            val savedFileEntity = file.saveFileEntity()
            val fileProcessorContext = FileProcessorContext(file, savedFileEntity, messageClient)
            val processor = processorFactory.getProcessor(file, fileProcessorContext)
            processor.process()
            processor.context.processResult()
        } catch (e: FileIssueException) {
            file.saveFileEntity().let { fileEntity ->
                importService.saveFileIssue(ImportFileIssue(file = fileEntity, type = e.type))
            }
        }
    }

    private val ImportFileDto.isArchive: Boolean
        get() {
            return this.name?.endsWith(".zip") ?: false
        }

    private fun ImportFileDto.saveFileEntity() = importService.saveFile(ImportFile(this.name, import))

    private fun ImportFileDto.saveArchiveEntity() = importService.saveArchive(ImportArchive(this.name!!, import))

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
            messageClient(FOUND_LANGUAGE, listOf(languageEntity.name))
            val matchingStoredLanguage = importDataManager.storedLanguages.find {
                it.name == entry.value.name && it.existingLanguage != null
            }
            if (matchingStoredLanguage == null) {
                languageEntity.existingLanguage = languageEntity.findMatchingExisting()
            }
            importService.saveLanguages(this.languages.values)
            importDataManager.storedLanguages.addAll(this.languages.values)
        }
    }

    private fun addToStoredTranslations(translation: ImportTranslation) {
        importDataManager.storedTranslations[translation.language]!!.let { it[translation.key]!!.add(translation) }
    }

    private fun FileProcessorContext.getOrCreateKey(name: String): ImportKey {
        var entity = importDataManager.storedKeys[name]
        if (entity == null) {
            entity = ImportKey(name = name)
            importDataManager.storedKeys[name] = entity
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
                val storedTranslations = importDataManager.getStoredTranslations(keyEntity, newTranslation.language)
                if (storedTranslations.size > 1) {
                    storedTranslations.forEach { collidingTranslations ->
                        fileEntity.addIssue(FileIssueType.MULTIPLE_VALUES_FOR_KEY_AND_LANGUAGE,
                                mapOf(
                                        FileIssueParamType.KEY_ID to collidingTranslations.key.id.toString(),
                                        FileIssueParamType.LANGUAGE_ID to collidingTranslations.language.id.toString()
                                )
                        )
                    }
                    return
                }
                this@CoreImportFilesProcessor.addToStoredTranslations(newTranslation)
            }
        }

        importDataManager.handleConflicts()
        importDataManager.saveAllStoredTranslations()
    }
}
