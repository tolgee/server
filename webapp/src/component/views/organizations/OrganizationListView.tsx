import * as React from 'react';
import {container} from 'tsyringe';
import {T, useTranslate} from "@tolgee/react";
import {OrganizationActions} from "../../../store/organization/OrganizationActions";
import {SimplePaginatedHateoasList} from "../../common/list/SimplePaginatedHateoasList";
import {LINKS, PARAMS} from "../../../constants/links";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import {Link} from "react-router-dom";
import {OrganizationRoleType} from "../../../service/response.types";
import {FabAddButtonLink} from "../../common/buttons/FabAddButtonLink";
import Box from "@material-ui/core/Box";
import {BaseUserSettingsView} from "../userSettings/BaseUserSettingsView";
import {SimpleListItem} from "../../common/list/SimpleListItem";
import {Button} from "@material-ui/core";
import {ResourceErrorComponent} from "../../common/form/ResourceErrorComponent";
import {useLeaveOrganization} from "../../../hooks/organizations/useLeaveOrganization";

const actions = container.resolve(OrganizationActions);

export const OrganizationsListView = () => {

    const t = useTranslate();

    const [leaveLoadable, leaveOrganization] = useLeaveOrganization()

    return (
        <BaseUserSettingsView title={t("organizations_title")} containerMaxWidth="lg">
            <ResourceErrorComponent error={leaveLoadable.error}/>
            <SimplePaginatedHateoasList
                actions={actions}
                loadableName={"listPermitted"}
                renderItem={(item) =>
                    <SimpleListItem
                        button
                        //@ts-ignore
                        component={Link}
                        key={item.id}
                        to={LINKS.REPOSITORY_TRANSLATIONS.build({[PARAMS.REPOSITORY_ID]: item.id})}
                    >
                        <ListItemText>
                            {item.name}
                        </ListItemText>
                        <ListItemSecondaryAction>
                            <Box mr={1} display="inline">
                                <Button variant="outlined"
                                        size="small"
                                        onClick={() => leaveOrganization(item.id!!)}
                                >
                                    <T>organization_users_leave</T>
                                </Button>
                            </Box>
                            {item.currentUserRole == OrganizationRoleType.OWNER &&
                            <Button variant="outlined"
                                    component={Link}
                                    size="small"
                                    to={LINKS.ORGANIZATION_PROFILE.build({[PARAMS.ORGANIZATION_ADDRESS_PART]: item.addressPart})}>
                                <T>organization_settings_button</T>
                            </Button>
                            }
                        </ListItemSecondaryAction>
                    </SimpleListItem>
                }/>
            <Box display="flex" flexDirection="column" alignItems="flex-end" mt={2} pr={2}>
                <FabAddButtonLink to={LINKS.ORGANIZATIONS_ADD.build()}/>
            </Box>
        </BaseUserSettingsView>
    );
}
