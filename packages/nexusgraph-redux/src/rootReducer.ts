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

import graphListReducer, { GRAPH_LIST_STATE as graphList } from "./graph-list/graphListDuck";
import graphReducer, { GRAPH as graph } from "./graph/graphDuck";
import oAuthReducer, { OAUTH_STATE as oAuth } from "./oAuth/oAuthDuck";

export default {
  [graph]: graphReducer,
  [oAuth]: oAuthReducer,
  [graphList]: graphListReducer,
};
