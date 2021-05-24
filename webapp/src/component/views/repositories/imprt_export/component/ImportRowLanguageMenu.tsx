import React, {ChangeEvent, FunctionComponent} from 'react';
import {Box, Dialog, DialogContent, DialogTitle, FormControl, FormHelperText, InputLabel, makeStyles, MenuItem, Select} from "@material-ui/core";
import {useRepositoryLanguages} from "../../../../../hooks/useRepositoryLanguages";
import {T} from "@tolgee/react";
import {container} from "tsyringe";
import {ImportActions} from "../../../../../store/repository/ImportActions";
import {useImportDataHelper} from "../hooks/useImportDataHelper";
import {useRepository} from "../../../../../hooks/useRepository";
import {Add} from "@material-ui/icons";
import clsx from "clsx";
import {useStateObject} from "../../../../../fixtures/useStateObject";
import {LanguageCreateForm} from "../../../../languages/LanguageCreateForm";
import {LanguageActions} from "../../../../../store/languages/LanguageActions";

const actions = container.resolve(ImportActions)
const languageActions = container.resolve(LanguageActions)
const useStyles = makeStyles(theme => ({
    item: {
        padding: `${theme.spacing(1)}, ${theme.spacing(2)}`
    },
    addNewItem: {
        color: theme.palette.primary.main
    },
    addIcon: {
        marginRight: theme.spacing(1),
        marginLeft: -2
    }
}))

const NEW_LANGUAGE_VALUE = "__new_language";
export const ImportRowLanguageMenu: FunctionComponent<{
    value?: number,
    importLanguageId: number
}> = (props) => {
    const languages = useRepositoryLanguages()
    const importData = useImportDataHelper()
    const usedLanguages = importData.result!._embedded!.languages!.map(l => l.existingLanguageId).filter(l => !!l)
    const repository = useRepository()
    const applyTouched = actions.useSelector(s => s.applyTouched)
    const classes = useStyles()
    const state = useStateObject({addNewLanguageDialogOpen: false})

    const dispatchChange = (value) => {
        actions.loadableActions.selectLanguage.dispatch({
            path: {
                repositoryId: repository.id,
                importLanguageId: props.importLanguageId,
                existingLanguageId: value
            }
        })
    }

    const onChange = (changeEvent: ChangeEvent<any>) => {
        const value = changeEvent.target.value;
        if (value == NEW_LANGUAGE_VALUE) {
            state.addNewLanguageDialogOpen = true
            return
        }
        dispatchChange(value)
    }

    const availableLanguages = languages.filter(lang => props.value == lang.id || usedLanguages.indexOf(lang.id) < 0)

    const items = availableLanguages.map(l =>
        <MenuItem value={l.id} key={l.id} className={clsx(classes.item)}>
            {l.name}
        </MenuItem>)

    items.push(
        <MenuItem key={0}
                  value={NEW_LANGUAGE_VALUE}
                  className={clsx(classes.item, classes.addNewItem)}
        >
            <Add fontSize="small" className={classes.addIcon}/>
            <T>import_result_language_menu_add_new</T>
        </MenuItem>
    )

    return (
        <>
            <FormControl fullWidth error={applyTouched && !props.value} data-cy="import-row-language-select-form-control">
                <InputLabel shrink id="import_row_language_select">
                    <T>import_language_select</T>
                </InputLabel>
                <Select
                    labelId="import_row_language_select"
                    value={props.value || ''}
                    onChange={onChange}
                    fullWidth
                >
                    {items}
                </Select>
                {(applyTouched && !props.value) &&
                <FormHelperText><T>import_existing_language_not_selected_error</T></FormHelperText>}
            </FormControl>
            <Dialog open={state.addNewLanguageDialogOpen} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title"><T>import_add_new_language_dialog_title</T></DialogTitle>
                <DialogContent>
                    <Box mt={-4}>
                        <LanguageCreateForm
                            onCreated={(language) => {
                                languageActions.loadableReset.list.dispatch()
                                dispatchChange(language.id)
                                languageActions.loadableReset.create.dispatch()
                            }}
                            onCancel={() => state.addNewLanguageDialogOpen = false}
                        />
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
};

