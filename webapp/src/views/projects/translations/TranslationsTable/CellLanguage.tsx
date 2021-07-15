import React from 'react';
import { makeStyles } from '@material-ui/core';

import { components } from 'tg.service/apiSchema.generated';
import { CircledLanguageIcon } from '../CircledLanguageIcon';
import { CellContent, CellPlain } from '../CellBase';

type LanguageModel = components['schemas']['LanguageModel'];

const useStyles = makeStyles({
  content: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    flexGrow: 1,
    flexShrink: 0,
    '& > * + *': {
      marginLeft: '5px',
    },
  },
});

type Props = {
  language: LanguageModel;
};

export const CellLanguage: React.FC<Props> = ({ language }) => {
  const classes = useStyles();
  return (
    <CellPlain>
      <CellContent>
        <div className={classes.content}>
          <CircledLanguageIcon flag={language.flagEmoji} />
          <div>{language.name}</div>
        </div>
      </CellContent>
    </CellPlain>
  );
};
