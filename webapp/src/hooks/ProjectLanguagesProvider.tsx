import { createContext, FunctionComponent, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { container } from 'tsyringe';

import { FullPageLoading } from '../component/common/FullPageLoading';
import { GlobalError } from '../error/GlobalError';
import { ProjectPreferencesService } from '../service/ProjectPreferencesService';
import { components } from '../service/apiSchema.generated';
import { useApiQuery } from '../service/http/useQueryApi';
import { AppState } from '../store';
import { TranslationActions } from '../store/project/TranslationActions';
import { useProject } from './useProject';

export const ProjectLanguagesContext =
  // @ts-ignore
  createContext<components['schemas']['PagedModelLanguageModel']>(null);

const translationActions = container.resolve(TranslationActions);
const selectedLanguagesService = container.resolve(ProjectPreferencesService);

export const ProjectLanguagesProvider: FunctionComponent = (props) => {
  const projectDTO = useProject();

  const selectedLanguages = useSelector(
    (state: AppState) => state.translations.selectedLanguages
  );

  const languagesLoadable = useApiQuery({
    url: '/v2/projects/{projectId}/languages',
    method: 'get',
    path: { projectId: projectDTO.id },
    query: {
      page: 0,
      size: 1000,
      sort: ['tag'],
    },
  });

  useEffect(() => {
    // reset languages when unmount
    return () => {
      languagesLoadable.remove();
    };
  }, []);

  useEffect(() => {
    translationActions.select.dispatch(null);
    if (languagesLoadable.data) {
      if (languagesLoadable.data._embedded?.languages?.length) {
        const selection = selectedLanguagesService.getUpdated(
          projectDTO.id,
          languagesLoadable.data._embedded.languages.map((l) => l.tag) || []
        );
        translationActions.select.dispatch(selection);
      } else {
        translationActions.select.dispatch(
          selectedLanguagesService.getForProject(projectDTO.id)
        );
      }
    }
  }, [languagesLoadable.data]);

  if (languagesLoadable.isFetching || !selectedLanguages) {
    return <FullPageLoading />;
  }

  if (languagesLoadable.data) {
    return (
      <ProjectLanguagesContext.Provider value={languagesLoadable.data}>
        {props.children}
      </ProjectLanguagesContext.Provider>
    );
  }

  throw new GlobalError(
    'Unexpected error occurred',
    languagesLoadable.error?.code || 'Loadable error'
  );
};
