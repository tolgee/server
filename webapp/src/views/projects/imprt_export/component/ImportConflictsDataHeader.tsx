import React, { FunctionComponent } from 'react';
import {
  Box,
  Button,
  Grid,
  Typography,
  useMediaQuery,
  useTheme,
} from '@material-ui/core';
import { T } from '@tolgee/react';
import { DoneAll } from '@material-ui/icons';
import { container } from 'tsyringe';
import { ImportActions } from 'tg.store/project/ImportActions';
import { useProject } from 'tg.hooks/useProject';
import { components } from 'tg.service/apiSchema.generated';

const actions = container.resolve(ImportActions);
export const ImportConflictsDataHeader: FunctionComponent<{
  language: components['schemas']['ImportLanguageModel'];
}> = (props) => {
  const project = useProject();

  const theme = useTheme();
  const isSmOrLower = useMediaQuery(theme.breakpoints.down('sm'));

  const keepAllExisting = () => {
    actions.loadableActions.resolveAllKeepExisting.dispatch({
      path: {
        projectId: project.id,
        languageId: props.language!.id,
      },
    });
  };

  const overrideAll = () => {
    actions.loadableActions.resolveAllOverride.dispatch({
      path: {
        projectId: project.id,
        languageId: props.language!.id,
      },
    });
  };

  const keepAllButton = (
    <Button
      data-cy="import-resolution-dialog-accept-old-button"
      fullWidth={isSmOrLower}
      startIcon={<DoneAll />}
      variant="outlined"
      color="inherit"
      onClick={keepAllExisting}
    >
      <T>import_resolution_accept_old</T>
    </Button>
  );
  const overrideAllButton = (
    <Button
      data-cy="import-resolution-dialog-accept-imported-button"
      fullWidth={isSmOrLower}
      startIcon={<DoneAll />}
      variant="outlined"
      color="inherit"
      onClick={overrideAll}
    >
      <T>import_resolution_accept_imported</T>
    </Button>
  );

  return (
    <Box
      pl={2}
      pt={2}
      pb={2}
      pr={2}
      mb={1}
      style={{
        borderBottom: `1px solid ${theme.palette.grey['200']}`,
      }}
    >
      {!isSmOrLower ? (
        <Grid container spacing={2} alignContent="center" alignItems="center">
          <Grid item lg={3} md>
            <Box pl={1}>
              <Typography>
                <b>
                  <T>import_resolve_header_key</T>
                </b>
              </Typography>
            </Box>
          </Grid>
          <Grid item lg md sm={12} xs={12}>
            <Box display="flex" alignItems="center">
              <Box pl={1} flexGrow={1}>
                <Typography>
                  <b>
                    <T>import_resolve_header_existing</T>
                  </b>
                </Typography>
              </Box>
              {keepAllButton}
            </Box>
          </Grid>
          <Grid item lg md sm={12} xs={12}>
            <Box display="flex" alignItems="center">
              <Box flexGrow={1}>
                <Typography>
                  <b>
                    <T>import_resolve_header_new</T>
                  </b>
                </Typography>
              </Box>
              {overrideAllButton}
            </Box>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={4}>
          <Grid item lg md sm xs>
            {keepAllButton}
          </Grid>
          <Grid item lg md sm xs>
            {overrideAllButton}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
