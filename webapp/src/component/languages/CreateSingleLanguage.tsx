import { T } from '@tolgee/react';
import { FunctionComponent, useEffect, useState } from 'react';
import { useProject } from 'tg.hooks/useProject';
import { components } from 'tg.service/apiSchema.generated';
import { Box } from '@material-ui/core';
import { ErrorResponseDto } from 'tg.service/response.types';
import { ResourceErrorComponent } from '../common/form/ResourceErrorComponent';
import { CreateLanguageField } from './CreateLanguageField';
import { useApiMutation } from 'tg.service/http/useQueryApi';
import { container } from 'tsyringe';
import { MessageService } from 'tg.service/MessageService';

const messageService = container.resolve(MessageService);

type LanguageDto = components['schemas']['LanguageDto'];

export const CreateSingleLanguage: FunctionComponent<{
  onCancel: () => void;
  onCreated?: (language: components['schemas']['LanguageModel']) => void;
  autoFocus?: boolean;
}> = (props) => {
  const project = useProject();
  const createLoadable = useApiMutation({
    url: '/v2/projects/{projectId}/languages',
    method: 'post',
  });
  const [value, setValue] = useState(null as LanguageDto | null);

  const onSubmit = (values) => {
    createLoadable.mutate(
      {
        path: {
          projectId: project.id,
        },
        content: {
          'application/json': values,
        },
      },
      {
        onSuccess(data) {
          props.onCreated && props.onCreated(data);
          setValue(null);
          messageService.success(<T>language_created_message</T>);
        },
      }
    );
  };

  const [serverError, setServerError] = useState(
    undefined as ErrorResponseDto | undefined
  );

  useEffect(() => {
    setServerError(createLoadable.error);
  }, [createLoadable.error]);

  return (
    <Box>
      {serverError && (
        <Box ml={2} mr={2}>
          <ResourceErrorComponent error={serverError} />
        </Box>
      )}
      <CreateLanguageField
        autoFocus={props.autoFocus}
        value={value}
        onSubmit={(values) => onSubmit(values)}
        showSubmitButton={true}
        onChange={(value) => {
          setValue(value);
          setServerError(undefined);
        }}
        onPreparedLanguageEdit={() => setServerError(undefined)}
      />
    </Box>
  );
};
