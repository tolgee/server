package io.tolgee.service

import io.tolgee.configuration.tolgee.TolgeeProperties
import io.tolgee.constants.Message
import io.tolgee.dtos.request.SignUpDto
import io.tolgee.dtos.request.UserUpdateRequestDTO
import io.tolgee.dtos.request.validators.exceptions.ValidationException
import io.tolgee.model.UserAccount
import io.tolgee.model.views.UserAccountInProjectView
import io.tolgee.model.views.UserAccountWithOrganizationRoleView
import io.tolgee.repository.UserAccountRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class UserAccountService(
  private val userAccountRepository: UserAccountRepository,
  private val tolgeeProperties: TolgeeProperties,
  private val emailVerificationService: EmailVerificationService
) {
  fun getByUserName(username: String?): Optional<UserAccount> {
    return userAccountRepository.findByUsername(username)
  }

  operator fun get(id: Long): Optional<UserAccount?> {
    return userAccountRepository.findById(id)
  }

  fun createUser(userAccount: UserAccount): UserAccount {
    userAccountRepository.save(userAccount)
    return userAccount
  }

  fun createUser(request: SignUpDto): UserAccount {
    dtoToEntity(request).let {
      this.createUser(it)
      return it
    }
  }

  fun delete(userAccount: UserAccount) {
    userAccountRepository.delete(userAccount)
  }

  fun dtoToEntity(request: SignUpDto): UserAccount {
    val encodedPassword = encodePassword(request.password!!)
    return UserAccount(name = request.name, username = request.email, password = encodedPassword)
  }

  val implicitUser: UserAccount
    get() {
      val username = "___implicit_user"
      return userAccountRepository.findByUsername(username).orElseGet {
        val account = UserAccount(name = "No auth user", username = username, role = UserAccount.Role.ADMIN)
        this.createUser(account)
        account
      }
    }

  fun findByThirdParty(type: String?, id: String?): Optional<UserAccount> {
    return userAccountRepository.findByThirdPartyAuthTypeAndThirdPartyAuthId(type!!, id!!)
  }

  @Transactional
  fun setResetPasswordCode(userAccount: UserAccount, code: String?) {
    val bCryptPasswordEncoder = BCryptPasswordEncoder()
    userAccount.resetPasswordCode = bCryptPasswordEncoder.encode(code)
    userAccountRepository.save(userAccount)
  }

  @Transactional
  fun setUserPassword(userAccount: UserAccount, password: String?) {
    val bCryptPasswordEncoder = BCryptPasswordEncoder()
    userAccount.password = bCryptPasswordEncoder.encode(password)
    userAccountRepository.save(userAccount)
  }

  @Transactional
  fun isResetCodeValid(userAccount: UserAccount, code: String?): Boolean {
    val bCryptPasswordEncoder = BCryptPasswordEncoder()
    return bCryptPasswordEncoder.matches(code, userAccount.resetPasswordCode)
  }

  @Transactional
  fun removeResetCode(userAccount: UserAccount) {
    userAccount.resetPasswordCode = null
  }

  fun getAllInOrganization(
    organizationId: Long,
    pageable: Pageable,
    search: String?
  ): Page<UserAccountWithOrganizationRoleView> {
    return userAccountRepository.getAllInOrganization(organizationId, pageable, search = search ?: "")
  }

  fun getAllInProject(projectId: Long, pageable: Pageable, search: String?): Page<UserAccountInProjectView> {
    return userAccountRepository.getAllInProject(projectId, pageable, search = search)
  }

  fun encodePassword(rawPassword: String): String {
    val bCryptPasswordEncoder = BCryptPasswordEncoder()
    return bCryptPasswordEncoder.encode(rawPassword)
  }

  @Transactional
  fun update(userAccount: UserAccount, dto: UserUpdateRequestDTO) {
    if (userAccount.username != dto.email) {
      getByUserName(dto.email).ifPresent { throw ValidationException(Message.USERNAME_ALREADY_EXISTS) }
      if (tolgeeProperties.authentication.needsEmailVerification) {
        emailVerificationService.createForUser(userAccount, dto.callbackUrl, dto.email)
      } else {
        userAccount.username = dto.email
      }
    }

    dto.password?.let {
      if (!it.isEmpty()) {
        userAccount.password = encodePassword(it)
      }
    }

    userAccount.name = dto.name
    userAccountRepository.save(userAccount)
  }

  fun saveAll(userAccounts: Collection<UserAccount>): MutableList<UserAccount> =
    userAccountRepository.saveAll(userAccounts)

  val isAnyUserAccount: Boolean
    get() = userAccountRepository.count() > 0
}
