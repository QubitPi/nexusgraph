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

import * as Sentry from "@sentry/react";
import { GraphClient } from "nexusgraph-db";
import { I18nextProvider } from "react-i18next";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import OAuth2Provider, { Callback, Signout } from "../../nexusgraph-oauth/src/OAuth2Provider";
import { ReduxStoreProvider, updateGraph, updateGraphList } from "../../nexusgraph-redux";
import DevApp from "./DevApp";
import i18n from "./i18n";
import ProdApp from "./ProdApp";

/**
 * {@link AppInit} offers common init/config and differentiated context wrapper for {@link DevApp | dev} and
 * {@link ProdApp | prod} instances.
 *
 * It defines init execution logics but does execute it. Instead, {@link DevApp} or {@link ProdApp} executes them.
 */
export default function AppInit(): JSX.Element {
  const initReduxStore = (userId: string, graphClient: GraphClient, dispatch: any) => {
    graphClient
      .getGraphListMetaDataByUserId(userId)
      .then((metaDataList) => {
        if (metaDataList.length <= 0) {
          return;
        }

        dispatch(updateGraphList(metaDataList));

        graphClient
          .getGraphById(metaDataList[0].id)
          .then((graph) => {
            dispatch(
              updateGraph({
                id: graph.id,
                name: graph.name,
                nodes: graph.nodes,
                links: graph.links,
              })
            );
          })
          .catch((error) => {
            Sentry.captureException(error);
            throw error;
          });
      })
      .catch((error) => {
        Sentry.captureException(error);
        throw error;
      });
  };

  if (process.env.SKIP_SIGN_IN == "true") {
    return (
      <I18nextProvider i18n={i18n}>
        <ReduxStoreProvider>
          <DevApp initReduxStore={initReduxStore} />
        </ReduxStoreProvider>
      </I18nextProvider>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ReduxStoreProvider>
        <BrowserRouter>
          <OAuth2Provider>
            <Routes>
              <Route path="/" element={<ProdApp initReduxStore={initReduxStore} />} />

              {/*the /Callback route CAN NOT involve authentication, so it must be put as a separate route outside of*/}
              {/*ProdApp where all auth checking and logging in happens*/}
              {/*See https://logto.qubitpi.org/tutorial/how-to-build-github-sign-in-with-react-and-logto/#handle-redirect*/}
              {/*for more details*/}
              <Route path="/callback" element={<Callback />} />

              <Route path="/signout" element={<Signout />} />
            </Routes>
          </OAuth2Provider>
        </BrowserRouter>
      </ReduxStoreProvider>
    </I18nextProvider>
  );
}

/**
 * Connects to Nexus Graph's monitoring system
 */
export function setupSentry(): void {
  Sentry.init({
    dsn: process.env.SENTRY_IO_DSN as string,
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: [/^https:\/\/app\.nexusgraph\.com/],
      }),
      new Sentry.Replay(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
