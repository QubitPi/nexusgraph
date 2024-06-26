/*
 * Copyright 2024 Jiaqi Liu. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { GraphClient } from "nexusgraph-db";
import { GraphClientContext } from "nexusgraph-db/src/Contexts";
import { updateOAuthState } from "nexusgraph-redux";
import { useDispatch } from "react-redux";
import App from "./App";

import initialData from "../../nexusgraph-db/src/graph/json-graphql-server/server/initial-data.json";
import { bindGraphClient, container } from "../inversify.config";
import TYPES from "../types";

interface DevAppProps {
  initReduxStore: (userId: string, graphClient: GraphClient, dispatch: any) => void;
}

/**
 * The {@link DevApp} does not involve OAuth2 authentication and authorization.
 *
 * All prod configurations are put here
 *
 * @returns DOM
 */
export default function DevApp(props: DevAppProps): JSX.Element {
  const dispatch = useDispatch();

  const devToken = "devToken";
  const devUserId = initialData["users"][0].id.toString();
  const devUserInfo = { sub: devUserId };

  dispatch(
    updateOAuthState({
      accessToken: devToken,
      userInfo: devUserInfo,
    })
  );

  bindGraphClient(devUserId, Number(devUserId), devToken);
  const graphClient = container.get<GraphClient>(TYPES.GraphApiClient);
  props.initReduxStore(devUserId, graphClient, dispatch);

  return (
    <GraphClientContext.Provider value={graphClient}>
      <App />
    </GraphClientContext.Provider>
  );
}
