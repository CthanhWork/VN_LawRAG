const LawUploadForm = ({ uploadState, setUploadState, onUpload, disabled }) => (
  <form className="admin__form admin__form--split" onSubmit={onUpload}>
    <input
      type="file"
      accept="application/pdf"
      onChange={(e) => setUploadState((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
    />
    <input
      type="text"
      placeholder="Mã văn bản"
      value={uploadState.code}
      onChange={(e) => setUploadState((prev) => ({ ...prev, code: e.target.value }))}
    />
    <input
      type="text"
      placeholder="Tiêu đề"
      value={uploadState.title}
      onChange={(e) => setUploadState((prev) => ({ ...prev, title: e.target.value }))}
    />
    <input
      type="date"
      value={uploadState.effectiveDate}
      onChange={(e) => setUploadState((prev) => ({ ...prev, effectiveDate: e.target.value }))}
    />
    <input
      type="text"
      placeholder="Loại văn bản (LAW, DECREE...)"
      value={uploadState.docType}
      onChange={(e) => setUploadState((prev) => ({ ...prev, docType: e.target.value }))}
    />
    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input
        type="checkbox"
        checked={uploadState.replaceExisting}
        onChange={(e) => setUploadState((prev) => ({ ...prev, replaceExisting: e.target.checked }))}
      />
      <span>Ghi đè nếu tồn tại</span>
    </label>
    <button type="submit" className="admin__btn" disabled={uploadState.loading || disabled}>
      {uploadState.loading ? 'Đang tải lên...' : 'Tải lên'}
    </button>
    {uploadState.error && <div className="admin__alert admin__alert--error">{uploadState.error}</div>}
    {uploadState.message && <div className="admin__alert admin__alert--success">{uploadState.message}</div>}
  </form>
);

export default LawUploadForm;
