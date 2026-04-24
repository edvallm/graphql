import { getToken } from './auth.js';

const GQL_URL = 'https://zone01.gr/api/graphql-engine/v1/graphql';

export async function query(gql, variables = {}) {
  const token = getToken();
  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: gql, variables }),
  });

  if (!res.ok) throw new Error(`GraphQL request failed (${res.status})`);

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);

  return json.data;
}
