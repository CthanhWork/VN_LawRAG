const Pager = ({ state, onPrev, onNext }) => (
  <div className="admin__pager">
    <button
      type="button"
      className="admin__btn admin__btn--ghost"
      disabled={!state.hasPrevious || state.loading}
      onClick={onPrev}
    >
      Trước
    </button>
    <span className="admin__pager-text">
      Trang {state.page + 1} / {Math.max(1, state.totalPages || 1)}
    </span>
    <button
      type="button"
      className="admin__btn admin__btn--ghost"
      disabled={!state.hasNext || state.loading}
      onClick={onNext}
    >
      Sau
    </button>
  </div>
);

export default Pager;
