package io.tolgee.service.dataImport.processors.poProcessor.data

class PoParserMeta {
    var projectIdVersion: String? = null
    var language: String? = null
    var pluralForms: String? = null
    var other: MutableMap<String, String> = mutableMapOf()
}
