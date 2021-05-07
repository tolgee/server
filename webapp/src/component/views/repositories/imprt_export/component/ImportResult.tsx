import React, {FunctionComponent, useState} from 'react';
import {components} from "../../../../../service/apiSchema";
import {Box, makeStyles, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@material-ui/core";
import {T} from "@tolgee/react";
import {ImportResultRow} from "./ImportResultRow";
import {ImportConflictResolutionDialog} from "./ImportConflictResolutionDialog";
import {RepositoryLanguagesProvider} from "../../../../../hooks/RepositoryLanguagesProvider";

type ImportResultProps = {
    result?: components["schemas"]["PagedModelImportLanguageModel"]
    onLoadData: () => void
}


const useStyles = makeStyles(theme => ({
    table: {
        "& th": {
            fontWeight: "bold"
        }
    }
}))

export const ImportResult: FunctionComponent<ImportResultProps> = (props) => {
    const classes = useStyles()

    const rows = props.result?._embedded?.languages
    const [resolveRow, setResolveRow] = useState(undefined as components["schemas"]["ImportLanguageModel"] | undefined)

    const onDialogClose = () => {
        props.onLoadData()
        setResolveRow(undefined)
    }

    if (!rows) {
        return <></>
    }

    return (
        <RepositoryLanguagesProvider>
            <ImportConflictResolutionDialog row={resolveRow} onClose={onDialogClose}/>
            <Box mt={5}>
                <TableContainer>
                    <Table className={classes.table}>
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <T>import_result_language_name_header</T>
                                </TableCell>
                                <TableCell>
                                    <T>import_result_file_name_header</T>
                                </TableCell>
                                <TableCell>
                                    <T>import_result_total_count_header</T>
                                </TableCell>
                                <TableCell>
                                    <T>import_result_total_conflict_count_header</T>
                                </TableCell>
                                <TableCell>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map(row => <ImportResultRow onResolveConflicts={setResolveRow} key={row.id} row={row}/>)}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </RepositoryLanguagesProvider>
    );
};
