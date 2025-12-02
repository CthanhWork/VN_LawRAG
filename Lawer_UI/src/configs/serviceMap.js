const gateway =
  import.meta.env.VITE_API_GATEWAY_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8080');
const lawBase =
  import.meta.env.VITE_LAW_SERVICE_URL || (import.meta.env.DEV ? '/law' : 'http://localhost:8080');
const socialBase =
  import.meta.env.VITE_SOCIAL_SERVICE_URL ||
  import.meta.env.VITE_AUTH_SERVICE_URL ||
  (import.meta.env.DEV ? '/social' : 'http://localhost:8082');
const socialAdminBase =
  import.meta.env.VITE_SOCIAL_ADMIN_URL ||
  import.meta.env.VITE_SOCIAL_SERVICE_URL ||
  (import.meta.env.DEV ? '/social' : 'http://localhost:8082');
const ragBase =
  import.meta.env.VITE_RAG_SERVICE_URL || (import.meta.env.DEV ? '/rag' : 'http://localhost:5001');

export const serviceBaseUrls = {
  gateway,
  auth: socialBase,
  law: lawBase,
  rag: ragBase,
  social: socialBase,
  socialAdmin: socialAdminBase,
};

export default serviceBaseUrls;
