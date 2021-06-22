import { useRouteMatch } from 'react-router-dom';
import { PARAMS } from '../../../constants/links';
import { useApiQuery } from '../../../service/http/useQueryApi';

export const useOrganization = () => {
  const match = useRouteMatch();
  const organizationSlug = match.params[PARAMS.ORGANIZATION_SLUG];

  const organization = useApiQuery({
    url: '/v2/organizations/{slug}',
    method: 'get',
    path: { slug: organizationSlug },
  });

  return organization.data;
};
