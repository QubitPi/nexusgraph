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

import axios from "axios";
import { inject, injectable } from "inversify";
import TYPES from "nexusgraph-app/types";
import { Graph, GraphMetaData, Link, Node } from "nexusgraph-redux";
import "reflect-metadata";
import { GraphClient } from "../GraphClient";

const GRAPH_API_ENDPOINT = process.env.GRAPH_API_ENDPOINT as string;

const RESPONSE_FRAGMENT = `
  fragment nodeAttributes on Node {
    id
    noteId
    fields
  }
`;

const RESPONSE_SCHEMA = `
  edges {
    node {
        id
        userId
        name
        nodes {
            edges {
                node {
                    ...nodeAttributes
                }
            }
        }
        links {
            edges {
                node {
                    id
                    sourceNode {
                        edges {
                            node {
                                ...nodeAttributes
                            }
                        }
                    }
                    targetNode {
                        edges {
                            node {
                                ...nodeAttributes
                            }
                        }
                    }
                    fields
                }
            }
        }
        dateCreated
        dateUpdated
    }
  }
`;

export const postGraphQuery = (query: string, accessToken: string): Promise<any> => {
  return axios.post(GRAPH_API_ENDPOINT, { query: query }, getHeaders(accessToken)).then((response) => {
    return response;
  });
};

export const getHeaders = (accessToken: string): object => {
  return {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer " + accessToken,
    },
  };
};

@injectable()
export class AstraiosGraphClient implements GraphClient {
  private _userPrimaryKey: number;
  private _userId;
  private _accessToken;

  public constructor(
    @inject(TYPES.userId) userId: string,
    @inject(TYPES.userPrimaryKey) userPrimaryKey: number,
    @inject(TYPES.accessToken) accessToken: string
  ) {
    this._userId = userId;
    this._userPrimaryKey = userPrimaryKey;
    this._accessToken = accessToken;
  }

  public saveOrUpdate(graph: Graph): Promise<Graph> {
    return graph.id == null ? create(graph) : update(graph);
    return this.saveOrUpdateNodes(graph.nodes).then((nodeIdMap) => {
      return this.saveOrUpdateLinks(graph.links, nodeIdMap).then((linkIdMap) => {
        return this.saveOrUpdateGraph(graph, nodeIdMap, linkIdMap).then((response) => {
          return this.toGraph(response);
        });
      });
    });
  }

  public getGraphById(graphId: number): Promise<Graph> {
    return postGraphQuery(
      `
      {
        graph(ids:["${graphId}"]) {
            ${RESPONSE_SCHEMA}
        }
      }
    
      ${RESPONSE_FRAGMENT}
      `,
      this._accessToken
    ).then((response) => {
      return this.toGraph(response);
    });
  }

  public deleteGraphById(graphId: number): Promise<Graph> {
    return postGraphQuery(
      `
      mutation {
        graph(op:DELETE, ids: ["${graphId}"]) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
      `,
      this._accessToken
    );
  }

  public getGraphListMetaDataByUserId(userId: string): Promise<GraphMetaData[]> {
    return postGraphQuery(
      `
      query getGraphListMetaDataByUserId {
        graph(filter:"userId==${userId}") {
          edges {
            node {
              id
              name
            }
          }
        }
      }
      `,
      this._accessToken
    ).then((response) => {
      return response.data.data.graph.edges.map((node: { node: any }) => {
        const metadata = node.node;
        return {
          id: metadata.id,
          name: metadata.name,
        };
      });
    });
  }

  private saveOrUpdateNodes(nodes: Node[]): Promise<Map<number, string>> {
    const idMap: Map<number, string> = new Map();
    return postGraphQuery(
      `
      mutation {
          node(op:UPSERT data:${nodes}) {
              edges {
                  node {
                      id
                  }
              }
          }
      }
      `,
      this._accessToken
    ).then((response) => {
      const createdNodeIds = response.data.data.node.edges.map((node: { node: { id: any } }) => {
        return node.node.id;
      });

      createdNodeIds.forEach((value: string, idx: number) => {
        idMap.set(nodes[idx].id as number, value);
      });

      return idMap;
    });
  }

  private saveOrUpdateLinks(links: Link[], nodeIdMap: Map<number, string>) {
    const linkEntities = links.map((link) => {
      return {
        id: link.id,
        sourceNode: link.source,
        targetNode: link.target,
        fields: link.fields,
      };
    });

    const idMap: Map<number, string> = new Map();
    return postGraphQuery(
      `
      mutation {
        link(
            op:UPSERT
            data:${linkEntities}
        ) {
            edges {
                node {
                    id
                }
            }
        }
    }
      `,
      this._accessToken
    ).then((response) => {
      const createdLinkIds = response.data.data.link.edges.map((node: { node: { id: any } }) => {
        return node.node.id;
      });

      createdLinkIds.forEach((value: string, idx: number) => {
        idMap.set(links[idx].id as number, value);
      });

      return idMap;
    });
  }

  private saveOrUpdateGraph(graph: Graph, nodeIdMap: Map<number, string>, linkIdMap: Map<number, string>) {
    const nodes = Array.from(nodeIdMap, ([key, dbId]) => {
      return {
        id: dbId,
      };
    });

    const links = Array.from(linkIdMap, ([key, dbId]) => {
      return {
        id: dbId,
      };
    });

    return postGraphQuery(
      `
      mutation {
        graph(
            op: UPSERT
            data:{
                userId: "${this._userId}",
                name: "${graph.name}",
                nodes: ${nodes},
                links: ${links}
            }
        ) {
            ${RESPONSE_SCHEMA}
        }
      }

      ${RESPONSE_FRAGMENT}
      `,
      this._accessToken
    );
  }

  private toGraph(response: any): Graph {
    return response.data.data.graph.edges.map((node: { node: any }) => {
      const graph = node.node;
      const nodes: any[] = graph.nodes.edges.map((node: { node: any }) => {
        return {
          id: node.node.id,
          fields: JSON.parse(node.node.fields),
        };
      });
      const links: any[] = graph.links.edges.map((node: { node: any }) => {
        const link = node.node;
        return {
          id: link.id,
          source: link.sourceNode.edges[0].node.id,
          target: link.targetNode.edges[0].node.id,
          fields: JSON.parse(link.fields),
        };
      });

      return {
        id: graph.id,
        name: graph.name,
        nodes: nodes,
        links: links,
      };
    })[0];
  }
}
