import MonacoEditor, {
  BeforeMount,
  OnChange,
  OnMount,
} from '@monaco-editor/react';
import completion from './icuCompletion';
import tokenizer from './icuTokenizer';
import icuValidator from './icuValidator';
import icuTheme from './icuTheme';
import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  wrapper: {
    '& .overflowingContentWidgets *': {
      zIndex: theme.zIndex.tooltip,
    },
  },
}));

type Props = {
  initialValue: string;
  variables: string[];
  height?: string;
  width?: string;
  onChange?: OnChange;
};

export const Editor = ({
  variables,
  initialValue,
  height = '100px',
  width,
  onChange,
}: Props) => {
  const beforeMount: BeforeMount = (monaco) => {
    monaco.languages.register({ id: 'icu' });
    monaco.languages.setMonarchTokensProvider('icu', tokenizer);
    monaco.languages.registerCompletionItemProvider(
      'icu',
      completion({
        variables,
        enableSnippets: true,
      })
    );
    monaco.editor.onDidCreateModel(icuValidator(monaco.editor));
  };

  const onMount: OnMount = (editor, monaco) => {
    monaco.editor.defineTheme('icuTheme', icuTheme);
    monaco.editor.setTheme('icuTheme');
  };

  const classes = useStyles();

  return (
    <div className={classes.wrapper}>
      <MonacoEditor
        defaultValue={initialValue}
        height={height}
        width={width}
        defaultLanguage="icu"
        options={{
          lineNumbers: 'off',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          theme: 'icuTheme',
          renderValidationDecorations: 'on',
          contextmenu: false,
          scrollbar: {
            alwaysConsumeMouseWheel: false,
          },
          folding: false,
          wordBasedSuggestions: false,
          fixedOverflowWidgets: true,
        }}
        beforeMount={beforeMount}
        onMount={onMount}
        onChange={onChange}
      />
    </div>
  );
};
