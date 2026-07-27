interface ApiEndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description?: string;
  auth?: boolean;
}

export default function ApiEndpoint({ method, path, description: _description, auth = true }: ApiEndpointProps) {
  const methodClass = `api-endpoint-method api-endpoint-method-${method.toLowerCase()}`;

  return (
    <div className="api-endpoint-badge">
      <span className={methodClass}>{method}</span>
      <code className="api-endpoint-path">{path}</code>
      {auth && <span className="api-endpoint-auth">🔒 Bearer</span>}
    </div>
  );
}

interface ApiEndpointCardProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  auth?: boolean;
  requestFields?: { name: string; type: string; required: boolean; desc: string }[];
  responseFields?: { name: string; type: string; desc: string }[];
  requestExample?: string;
  responseExample?: string;
  children?: React.ReactNode;
}

export function ApiEndpointCard({
  method,
  path,
  description,
  auth = true,
  requestFields,
  responseFields,
  requestExample,
  responseExample,
  children,
}: ApiEndpointCardProps) {
  return (
    <div className="api-card">
      <div className="api-card-header">
        <ApiEndpoint method={method} path={path} auth={auth} />
      </div>
      <p className="api-card-desc">{description}</p>

      {requestFields && requestFields.length > 0 && (
        <div className="api-card-section">
          <h4 className="api-card-section-title">Request Body</h4>
          <div className="api-fields">
            {requestFields.map((f) => (
              <div key={f.name} className="api-field">
                <div className="api-field-header">
                  <code className="api-field-name">{f.name}</code>
                  <span className="api-field-type">{f.type}</span>
                  {f.required && <span className="api-field-required">Required</span>}
                </div>
                <p className="api-field-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {responseFields && responseFields.length > 0 && (
        <div className="api-card-section">
          <h4 className="api-card-section-title">Response</h4>
          <div className="api-fields">
            {responseFields.map((f) => (
              <div key={f.name} className="api-field">
                <div className="api-field-header">
                  <code className="api-field-name">{f.name}</code>
                  <span className="api-field-type">{f.type}</span>
                </div>
                <p className="api-field-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {requestExample && (
        <div className="api-card-section">
          <h4 className="api-card-section-title">Example Request</h4>
          <div className="code-block">
            <pre className="code-block-pre">
              <code className="code-block-code language-json">{requestExample}</code>
            </pre>
          </div>
        </div>
      )}

      {responseExample && (
        <div className="api-card-section">
          <h4 className="api-card-section-title">Example Response</h4>
          <div className="code-block">
            <pre className="code-block-pre">
              <code className="code-block-code language-json">{responseExample}</code>
            </pre>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
