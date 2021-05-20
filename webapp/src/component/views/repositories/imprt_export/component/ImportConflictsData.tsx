import React, {FunctionComponent, useEffect, useState} from "react";
import {components} from "../../../../../service/apiSchema";
import {container} from "tsyringe";
import {ImportActions} from "../../../../../store/repository/ImportActions";
import {useRepository} from "../../../../../hooks/useRepository";
import {Box, FormControlLabel, Grid, Switch, Typography} from "@material-ui/core";
import {BoxLoading} from "../../../../common/BoxLoading";
import {EmptyListMessage} from "../../../../common/EmptyListMessage";
import {T} from "@tolgee/react";
import {Pagination} from "@material-ui/lab";
import {startLoading, stopLoading} from "../../../../../hooks/loading";
import {ImportConflictTranslationsPair} from "./ImportConflictTranslationsPair";
import {SecondaryBar} from "../../../../layout/SecondaryBar";
import {ImportConflictsDataHeader} from "./ImportConflictsDataHeader";

const actions = container.resolve(ImportActions)
export const ImportConflictsData: FunctionComponent<{
    row: components["schemas"]["ImportLanguageModel"]
}> = (props) => {
    const conflictsLoadable = actions.useSelector(s => s.loadables.conflicts)
    const repository = useRepository()
    const languageId = props.row.id
    const [showResolved, setOnlyUnresolved] = useState(true)

    const setOverrideLoadable = actions.useSelector(s => s.loadables.resolveTranslationConflictOverride)
    const setKeepLoadable = actions.useSelector(s => s.loadables.resolveTranslationConflictKeep)

    const loadData = (page = 0) => {
        actions.loadableActions.conflicts.dispatch(
            {
                path: {
                    languageId: languageId,
                    repositoryId: repository.id
                },
                query: {
                    onlyConflicts: true,
                    onlyUnresolved: !showResolved,
                    pageable: {
                        page: page,
                        size: 50
                    }
                }
            }
        )
    }

    const data = conflictsLoadable.data?._embedded?.translations
    const totalPages = conflictsLoadable.data?.page?.totalPages
    const page = conflictsLoadable.data?.page?.number

    useEffect(() => {
        loadData(0)
    }, [props.row, showResolved])

    useEffect(() => {
        if (setOverrideLoadable.loaded || setKeepLoadable.loaded) {
            setTimeout(() => {
                loadData(page)
            }, 300)
        }
    }, [setOverrideLoadable.loading, setKeepLoadable.loading])

    useEffect(() => {
        if (!conflictsLoadable.loading) {
            stopLoading()
            actions.loadableReset.resolveTranslationConflictKeep.dispatch()
            actions.loadableReset.resolveTranslationConflictOverride.dispatch()
            return
        }
        startLoading()
    }, [conflictsLoadable.loading])

    if (!conflictsLoadable.loaded) {
        return <BoxLoading/>
    }

    return (
        <>
            <SecondaryBar>
                <FormControlLabel
                    control={
                        <Switch
                            checked={showResolved}
                            onChange={() => setOnlyUnresolved(!showResolved)}
                            name="filter_unresolved"
                            color="primary"
                        />
                    }
                    label={<T>import_conflicts_filter_show_resolved_label</T>}
                />
            </SecondaryBar>
            {conflictsLoadable.loaded && (data ?
                <>
                    <ImportConflictsDataHeader language={props.row}/>
                    {data.map(t =>
                        <Box pt={1} pb={1} pl={2} pr={2} key={t.id}>
                            <Grid container spacing={2}>
                                <Grid item lg={3} md>
                                    <Box p={1}>
                                        <Typography style={{overflowWrap: "break-word"}} variant={"body2"}><b>{t.keyName}</b></Typography>
                                    </Box>
                                </Grid>
                                <ImportConflictTranslationsPair translation={t} languageId={languageId}/>
                            </Grid>
                        </Box>)}
                </>
                :
                <EmptyListMessage><T>import_resolve_conflicts_empty_list_message</T></EmptyListMessage>)
            }
            <Box display="flex" justifyContent="flex-end" p={4}>
                {totalPages!! > 1 &&
                <Pagination
                    page={page!! + 1}
                    count={totalPages}
                    onChange={(_, page) => loadData(page - 1)}
                />}
            </Box>
        </>
    )
}
