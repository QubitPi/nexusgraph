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

import { Provider } from "react-redux";
import { combineReducers, createStore } from "redux";

import { GlobalState } from "./globalState";
import rootReducers from "./rootReducer";

interface ReduxChildren {
  children: React.ReactNode;
}

const reducer = combineReducers<GlobalState>({ ...(rootReducers as any) });
const store = createStore<GlobalState>(reducer);

/**
 * A wrapper of the original [React Redux Provider](https://react-redux.qubitpi.org/api/provider/) with a pre-configured
 * store defined by {@link rootReducer}
 *
 * @param children  A React component tree that needs to access the pre-configured Redux store
 *
 * @returns a native and fully initialized [React Redux Provider](https://react-redux.qubitpi.org/api/provider/) for
 * nexus graph
 */
const ReduxStoreProvider = ({ children }: ReduxChildren) => {
  return <Provider store={store}>{children}</Provider>;
};

export default ReduxStoreProvider;
