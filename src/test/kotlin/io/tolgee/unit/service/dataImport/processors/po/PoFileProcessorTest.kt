package io.tolgee.unit.service.dataImport.processors.po

import io.tolgee.assertions.Assertions.assertThat
import io.tolgee.dtos.dataImport.ImportFileDto
import io.tolgee.model.dataImport.Import
import io.tolgee.model.dataImport.ImportFile
import io.tolgee.service.dataImport.processors.FileProcessorContext
import io.tolgee.service.dataImport.processors.po.PoFileProcessor
import org.mockito.kotlin.mock
import org.testng.annotations.BeforeMethod
import org.testng.annotations.Test
import java.io.File

class PoFileProcessorTest {
    private lateinit var importMock: Import
    private lateinit var importFile: ImportFile
    private lateinit var importFileDto: ImportFileDto
    private lateinit var fileProcessorContext: FileProcessorContext

    @BeforeMethod
    fun setup() {
        importMock = mock()
        importFile = ImportFile("exmample.po", importMock)
        importFileDto = ImportFileDto("exmample.po", File("src/test/resources/import/po/example.po")
                .inputStream())
        fileProcessorContext = FileProcessorContext(importFileDto, importFile, mock())
    }

    @Test
    fun `processes po file correctly`() {
        PoFileProcessor(fileProcessorContext).process()
        assertThat(fileProcessorContext.languages).hasSize(1)
        assertThat(fileProcessorContext.translations).hasSize(8)
        assertThat(fileProcessorContext.translations["%d pages read."]?.get(0)?.text)
                .isEqualTo("{0, plural,\n" +
                        "one {Eine Seite gelesen wurde.}\n" +
                        "other {{0, number} Seiten gelesen wurden.}\n" +
                        "}")
        assertThat(fileProcessorContext.translations.values.toList()[2][0].text)
                .isEqualTo("Willkommen zurück, {0}! Dein letzter Besuch war am {1}")
    }
}