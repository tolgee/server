package io.tolgee.model.import

import io.tolgee.model.StandardAuditModel
import io.tolgee.model.Repository
import io.tolgee.model.UserAccount
import javax.persistence.Entity
import javax.persistence.ManyToOne
import javax.validation.constraints.NotNull

@Entity
class Import(
        @field:NotNull
        @ManyToOne(optional = false)
        val author: UserAccount,

        @field:NotNull
        @ManyToOne(optional = false)
        val repository: Repository
) : StandardAuditModel()
