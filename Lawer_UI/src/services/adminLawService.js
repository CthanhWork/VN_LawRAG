import axios from 'axios';
import { serviceBaseUrls } from '../configs/serviceMap';

const client = axios.create({
  baseURL: serviceBaseUrls.law,
  timeout: 180000,
});

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );

const withKey = (apiKey, headers = {}) =>
  apiKey ? { ...headers, 'X-API-KEY': apiKey } : { ...headers };

export const listLaws = async ({ keyword, page = 0, size = 20 } = {}, apiKey) => {
  const response = await client.request({
    method: 'get',
    url: '/api/admin/laws',
    params: cleanParams({ keyword, page, size }),
    headers: withKey(apiKey),
  });
  return response.data;
};

export const getLaw = async (id, apiKey) => {
  const response = await client.request({
    method: 'get',
    url: `/api/admin/laws/${id}`,
    headers: withKey(apiKey),
  });
  return response.data;
};

export const getToc = async (id, apiKey) => {
  const response = await client.request({
    method: 'get',
    url: `/api/admin/laws/${id}/toc`,
    headers: withKey(apiKey),
  });
  return response.data;
};

export const getRelated = async (id, docType, apiKey) => {
  const response = await client.request({
    method: 'get',
    url: `/api/admin/laws/${id}/related`,
    params: cleanParams({ docType }),
    headers: withKey(apiKey),
  });
  return response.data;
};

export const listNodes = async (lawId, { effectiveAt, page = 0, size = 20 } = {}, apiKey) => {
  const response = await client.request({
    method: 'get',
    url: `/api/admin/laws/${lawId}/nodes`,
    params: cleanParams({ effectiveAt, page, size }),
    headers: withKey(apiKey),
  });
  return response.data;
};

export const listNodesByParent = async (
  lawId,
  { parentId, effectiveAt, page = 0, size = 20 } = {},
  apiKey,
) => {
  const response = await client.request({
    method: 'get',
    url: `/api/admin/laws/${lawId}/nodes/by-parent`,
    params: cleanParams({ parentId, effectiveAt, page, size }),
    headers: withKey(apiKey),
  });
  return response.data;
};

export const getNode = async (id, apiKey) => {
  const response = await client.request({
    method: 'get',
    url: `/api/admin/laws/nodes/${id}`,
    headers: withKey(apiKey),
  });
  return response.data;
};

export const searchNodes = async ({ keyword, effectiveAt, page = 0, size = 20 } = {}, apiKey) => {
  const response = await client.request({
    method: 'get',
    url: '/api/admin/laws/nodes/search',
    params: cleanParams({ keyword, effectiveAt, page, size }),
    headers: withKey(apiKey),
  });
  return response.data;
};

export const searchNodesFulltext = async ({ q, page = 0, size = 20 } = {}, apiKey) => {
  const response = await client.request({
    method: 'get',
    url: '/api/admin/laws/nodes/search/fulltext',
    params: cleanParams({ q, page, size }),
    headers: withKey(apiKey),
  });
  return response.data;
};

export const qaAnalyze = async (body, { effectiveAt } = {}, apiKey) => {
  const response = await client.request({
    method: 'post',
    url: '/api/admin/laws/qa/analyze',
    params: cleanParams({ effectiveAt }),
    data: body,
    headers: withKey(apiKey),
  });
  return response.data;
};

export const suggest = async (keyword, limit = 10, apiKey) => {
  const response = await client.request({
    method: 'get',
    url: '/api/admin/laws/suggest',
    params: cleanParams({ keyword, limit }),
    headers: withKey(apiKey),
  });
  return response.data;
};

export const uploadLaw = async ({ file, meta = {} }, apiKey) => {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  formData.append(
    'meta',
    JSON.stringify({
      code: meta.code,
      title: meta.title,
      docType: meta.docType,
      issuingBody: meta.issuingBody,
      promulgationDate: meta.promulgationDate,
      effectiveDate: meta.effectiveDate,
      expireDate: meta.expireDate,
      relatedLawId: meta.relatedLawId,
      replaceExisting: Boolean(meta.replaceExisting),
      triggerReindex: Boolean(meta.triggerReindex),
      nodeEffectiveStart: meta.nodeEffectiveStart,
      nodeEffectiveEnd: meta.nodeEffectiveEnd,
    }),
  );
  const response = await client.request({
    method: 'post',
    url: '/api/admin/laws/upload',
    data: formData,
    headers: withKey(apiKey, { 'Content-Type': 'multipart/form-data' }),
  });
  return response.data;
};

const adminLawService = {
  listLaws,
  getLaw,
  getToc,
  getRelated,
  listNodes,
  listNodesByParent,
  getNode,
  searchNodes,
  searchNodesFulltext,
  qaAnalyze,
  suggest,
  uploadLaw,
};

export default adminLawService;
