import { FunctionComponent } from 'react';
import { container } from 'tsyringe';

import { useHistory } from 'react-router-dom';

import { T } from '@tolgee/react';
import { Validation } from 'tg.constants/GlobalValidationSchema';
import { SetPasswordFields } from 'tg.component/security/SetPasswordFields';
import { UserUpdateDTO } from 'tg.service/request.types';
import { TextField } from 'tg.component/common/form/fields/TextField';
import { BaseUserSettingsView } from './BaseUserSettingsView';
import { StandardForm } from 'tg.component/common/form/StandardForm';
import { useFormikContext } from 'formik';
import { Box, Typography } from '@material-ui/core';
import { useConfig } from 'tg.hooks/useConfig';
import { useApiMutation, useApiQuery } from 'tg.service/http/useQueryApi';
import { MessageService } from 'tg.service/MessageService';

const messagesService = container.resolve(MessageService);

export const UserProfileView: FunctionComponent = () => {
  const userLoadable = useApiQuery({
    url: '/api/user',
    method: 'get',
    options: {
      cacheTime: 0,
    },
  });

  const updateUser = useApiMutation({
    url: '/api/user',
    method: 'post',
  });

  const handleSubmit = (v: UserUpdateDTO) => {
    if (!v.password) {
      delete v.password;
    }
    // @ts-ignore
    v.callbackUrl = window.location.protocol + '//' + window.location.host;
    updateUser.mutate(
      { content: { 'application/json': v } },
      {
        onSuccess() {
          messagesService.success(<T>User data - Successfully updated!</T>);
          userLoadable.refetch();
        },
      }
    );
  };

  const history = useHistory();
  const config = useConfig();

  const Fields = () => {
    const formik = useFormikContext();
    const initialEmail = formik.getFieldMeta('email').initialValue;
    const newEmail = formik.getFieldMeta('email').value;
    const emailChanged = newEmail !== initialEmail;

    return (
      <>
        <TextField name="name" label={<T>User settings - Full name</T>} />
        <TextField name="email" label={<T>User settings - E-mail</T>} />
        {userLoadable?.data?.emailAwaitingVerification && (
          <Box>
            <Typography variant="body1">
              <T
                parameters={{
                  email: userLoadable.data.emailAwaitingVerification!,
                }}
              >
                email_waiting_for_verification
              </T>
            </Typography>
          </Box>
        )}

        {emailChanged && config.needsEmailVerification && (
          <Typography variant="body1">
            <T>your_email_was_changed_verification_message</T>
          </Typography>
        )}
        <SetPasswordFields />
      </>
    );
  };

  return (
    <BaseUserSettingsView
      title={<T>user_profile_title</T>}
      loading={userLoadable.isFetching}
    >
      {userLoadable.data && (
        <StandardForm
          saveActionLoadable={updateUser}
          initialValues={
            {
              password: '',
              passwordRepeat: '',
              name: userLoadable.data.name,
              email: userLoadable.data.username,
            } as UserUpdateDTO
          }
          validationSchema={Validation.USER_SETTINGS}
          onCancel={() => history.goBack()}
          onSubmit={handleSubmit}
        >
          <Fields />
        </StandardForm>
      )}
    </BaseUserSettingsView>
  );
};
