from graphviz import Digraph


def make_overall_usecase() -> Digraph:
  """
  Sơ đồ Use Case tổng quan:
  - Diễn viên: Người dùng, Admin
  - Use case chính của VN LAW System
  """
  g = Digraph("VN_LAW_USECASE_OVERVIEW", filename="vn_law_usecase_overview", format="png")
  g.attr(rankdir="LR", splines="polyline", fontsize="11", fontname="Arial")
  g.attr("node", fontname="Arial")
  g.attr("edge", fontname="Arial")

  # Actors (bên ngoài hệ thống)
  g.attr("node", shape="plaintext")
  g.node("User", "<<actor>>\nNgười dùng")
  g.node("Admin", "<<actor>>\nAdmin")

  # System boundary
  with g.subgraph(name="cluster_system") as c:
    c.attr(label="VN LAW System", style="rounded", color="black", fontsize="12")
    c.attr("node", shape="ellipse")
    usecases = {
      "UC_Login": "Đăng nhập / Đăng ký",
      "UC_QA": "Đặt câu hỏi pháp lý (QA)",
      "UC_Analyze": "Phân tích tình huống (Analyze)",
      "UC_ViewContext": "Xem trích dẫn / bối cảnh luật",
      "UC_History": "Xem lịch sử truy vấn",
      "UC_Profile": "Quản lý thông tin tài khoản",
      "UC_ManageUsers": "Quản lý người dùng",
      "UC_ManageCorpus": "Quản lý corpus luật",
      "UC_AdminReindex": "Yêu cầu reindex / embed lại",
      "UC_AdminMonitor": "Theo dõi trạng thái hệ thống",
    }
    for code, label in usecases.items():
      c.node(code, label)

  g.attr("edge", dir="none")

  # User interactions
  g.edge("User", "UC_Login")
  g.edge("User", "UC_QA")
  g.edge("User", "UC_Analyze")
  g.edge("User", "UC_ViewContext")
  g.edge("User", "UC_History")
  g.edge("User", "UC_Profile")

  # Admin interactions
  g.edge("Admin", "UC_Login")
  g.edge("Admin", "UC_ManageUsers")
  g.edge("Admin", "UC_ManageCorpus")
  g.edge("Admin", "UC_AdminReindex")
  g.edge("Admin", "UC_AdminMonitor")

  return g


def make_user_usecase() -> Digraph:
  """
  Sơ đồ Use Case chi tiết cho Người dùng:
  - Dựa trên trang Home, Rag, Profile, Account, flow OTP/Reset
  """
  g = Digraph("VN_LAW_USECASE_USER", filename="vn_law_usecase_user", format="png")
  g.attr(rankdir="LR", splines="polyline", fontsize="11", fontname="Arial")
  g.attr("node", fontname="Arial")
  g.attr("edge", fontname="Arial")

  # Actor
  g.attr("node", shape="plaintext")
  g.node("User", "<<actor>>\nNgười dùng")

  # System boundary
  with g.subgraph(name="cluster_user") as c:
    c.attr(label="VN LAW - Chức năng người dùng", style="rounded", color="black", fontsize="12")
    c.attr("node", shape="ellipse")

    c.node("UC_Register", "Đăng ký tài khoản")
    c.node("UC_Login", "Đăng nhập / Đăng xuất")
    c.node("UC_Forgot", "Quên mật khẩu / OTP")
    c.node("UC_ResetPwd", "Đặt lại mật khẩu")

    c.node("UC_QA", "Đặt câu hỏi pháp lý (QA)")
    c.node("UC_Analyze", "Phân tích tình huống (Analyze)")
    c.node("UC_SetEffective", "Chọn ngày hiệu lực")
    c.node("UC_ViewAnswer", "Xem câu trả lời & giải thích")
    c.node("UC_ViewCitations", "Xem trích dẫn điều luật")
    c.node("UC_History", "Xem lịch sử câu hỏi")

    c.node("UC_ViewLaws", "Xem danh sách văn bản luật")
    c.node("UC_ViewToc", "Xem mục lục (TOC) của luật")
    c.node("UC_SearchLaw", "Tìm kiếm / gợi ý văn bản luật")

    c.node("UC_Profile", "Xem / cập nhật thông tin tài khoản")

  # Quan hệ actor – use case
  g.attr("edge", dir="none")
  g.edge("User", "UC_Register")
  g.edge("User", "UC_Login")
  g.edge("User", "UC_Forgot")
  g.edge("User", "UC_ResetPwd")

  g.edge("User", "UC_QA")
  g.edge("User", "UC_Analyze")
  g.edge("User", "UC_History")
  g.edge("User", "UC_ViewLaws")
  g.edge("User", "UC_ViewToc")
  g.edge("User", "UC_SearchLaw")
  g.edge("User", "UC_Profile")

  # include / extends (dashed)
  g.attr("edge", dir="forward", style="dashed", label="include")
  g.edge("UC_QA", "UC_ViewAnswer")
  g.edge("UC_QA", "UC_ViewCitations")

  g.edge("UC_Analyze", "UC_SetEffective")
  g.edge("UC_Analyze", "UC_ViewAnswer")
  g.edge("UC_Analyze", "UC_ViewCitations")

  g.edge("UC_Forgot", "UC_ResetPwd")

  return g


def make_admin_usecase() -> Digraph:
  """
  Sơ đồ Use Case chi tiết cho Admin:
  - Dựa trên AdminDashboard (UsersPanel, PostsPanel, LawsPanel)
  - Dựa trên AdminController, AdminLawQueryController, social-service
  """
  g = Digraph("VN_LAW_USECASE_ADMIN", filename="vn_law_usecase_admin", format="png")
  g.attr(rankdir="LR", splines="polyline", fontsize="11", fontname="Arial")
  g.attr("node", fontname="Arial")
  g.attr("edge", fontname="Arial")

  # Actor
  g.attr("node", shape="plaintext")
  g.node("Admin", "<<actor>>\nAdmin")

  # System boundary
  with g.subgraph(name="cluster_admin") as c:
    c.attr(label="VN LAW - Chức năng Admin", style="rounded", color="black", fontsize="12")
    c.attr("node", shape="ellipse")

    # Quản lý người dùng
    c.node("UC_ManageUsers", "Quản lý người dùng")
    c.node("UC_ManageRoles", "Gán / thay đổi vai trò")
    c.node("UC_LockUser", "Khoá / mở khoá tài khoản")

    # Mạng xã hội / bài viết (social-service)
    c.node("UC_ReviewPosts", "Xem / duyệt bài viết")
    c.node("UC_ModerateComments", "Quản lý bình luận")

    # Corpus luật
    c.node("UC_ManageCorpus", "Quản lý corpus luật")
    c.node("UC_UploadLaw", "Tải lên PDF/văn bản luật mới")
    c.node("UC_UpdateLawMeta", "Cập nhật metadata văn bản luật")

    # RAG / hệ thống
    c.node("UC_Reindex", "Yêu cầu reindex / embed lại")
    c.node("UC_ViewStats", "Xem thống kê truy vấn / sử dụng")
    c.node("UC_ViewStatus", "Theo dõi trạng thái RAG / LLM")

  # Quan hệ actor – use case
  g.attr("edge", dir="none")
  g.edge("Admin", "UC_ManageUsers")
  g.edge("Admin", "UC_ManageRoles")
  g.edge("Admin", "UC_LockUser")

  g.edge("Admin", "UC_ReviewPosts")
  g.edge("Admin", "UC_ModerateComments")

  g.edge("Admin", "UC_ManageCorpus")
  g.edge("Admin", "UC_UploadLaw")
  g.edge("Admin", "UC_UpdateLawMeta")

  g.edge("Admin", "UC_Reindex")
  g.edge("Admin", "UC_ViewStats")
  g.edge("Admin", "UC_ViewStatus")

  # include (dashed) giữa các UC
  g.attr("edge", dir="forward", style="dashed", label="include")
  g.edge("UC_ManageUsers", "UC_ManageRoles")
  g.edge("UC_ManageUsers", "UC_LockUser")

  g.edge("UC_ManageCorpus", "UC_UploadLaw")
  g.edge("UC_ManageCorpus", "UC_UpdateLawMeta")
  g.edge("UC_ManageCorpus", "UC_Reindex")

  return g


def make_user_auth_usecase() -> Digraph:
  """
  Sơ đồ Use Case con: Xác thực & tài khoản người dùng.
  """
  g = Digraph("VN_LAW_USECASE_USER_AUTH", filename="vn_law_usecase_user_auth", format="png")
  g.attr(rankdir="LR", splines="polyline", fontsize="11", fontname="Arial")
  g.attr("node", fontname="Arial")
  g.attr("edge", fontname="Arial")

  g.attr("node", shape="plaintext")
  g.node("User", "<<actor>>\nNgười dùng")

  with g.subgraph(name="cluster_user_auth") as c:
    c.attr(label="VN LAW - Xác thực & Tài khoản", style="rounded", color="black", fontsize="12")
    c.attr("node", shape="ellipse")
    c.node("UC_Register", "Đăng ký tài khoản")
    c.node("UC_Login", "Đăng nhập / Đăng xuất")
    c.node("UC_Forgot", "Quên mật khẩu / nhận OTP")
    c.node("UC_ResetPwd", "Đặt lại mật khẩu")
    c.node("UC_Profile", "Xem / cập nhật thông tin tài khoản")

  g.attr("edge", dir="none")
  g.edge("User", "UC_Register")
  g.edge("User", "UC_Login")
  g.edge("User", "UC_Forgot")
  g.edge("User", "UC_ResetPwd")
  g.edge("User", "UC_Profile")

  g.attr("edge", dir="forward", style="dashed", label="include")
  g.edge("UC_Forgot", "UC_ResetPwd")

  return g


def make_user_qa_usecase() -> Digraph:
  """
  Sơ đồ Use Case con: Hỏi đáp pháp lý & phân tích tình huống.
  """
  g = Digraph("VN_LAW_USECASE_USER_QA", filename="vn_law_usecase_user_qa", format="png")
  g.attr(rankdir="LR", splines="polyline", fontsize="11", fontname="Arial")
  g.attr("node", fontname="Arial")
  g.attr("edge", fontname="Arial")

  g.attr("node", shape="plaintext")
  g.node("User", "<<actor>>\nNgười dùng")

  with g.subgraph(name="cluster_user_qa") as c:
    c.attr(label="VN LAW - Hỏi đáp & phân tích", style="rounded", color="black", fontsize="12")
    c.attr("node", shape="ellipse")
    c.node("UC_QA", "Đặt câu hỏi pháp lý (QA)")
    c.node("UC_Analyze", "Phân tích tình huống (Analyze)")
    c.node("UC_SetEffective", "Chọn ngày hiệu lực áp dụng")
    c.node("UC_ViewAnswer", "Xem câu trả lời & giải thích")
    c.node("UC_ViewCitations", "Xem trích dẫn điều luật liên quan")
    c.node("UC_History", "Xem lịch sử câu hỏi")

  g.attr("edge", dir="none")
  g.edge("User", "UC_QA")
  g.edge("User", "UC_Analyze")
  g.edge("User", "UC_History")

  g.attr("edge", dir="forward", style="dashed", label="include")
  g.edge("UC_QA", "UC_ViewAnswer")
  g.edge("UC_QA", "UC_ViewCitations")
  g.edge("UC_Analyze", "UC_SetEffective")
  g.edge("UC_Analyze", "UC_ViewAnswer")
  g.edge("UC_Analyze", "UC_ViewCitations")

  return g


def make_user_law_usecase() -> Digraph:
  """
  Sơ đồ Use Case con: Tra cứu văn bản luật.
  """
  g = Digraph("VN_LAW_USECASE_USER_LAW", filename="vn_law_usecase_user_law", format="png")
  g.attr(rankdir="LR", splines="polyline", fontsize="11", fontname="Arial")
  g.attr("node", fontname="Arial")
  g.attr("edge", fontname="Arial")

  g.attr("node", shape="plaintext")
  g.node("User", "<<actor>>\nNgười dùng")

  with g.subgraph(name="cluster_user_law") as c:
    c.attr(label="VN LAW - Tra cứu văn bản luật", style="rounded", color="black", fontsize="12")
    c.attr("node", shape="ellipse")
    c.node("UC_ViewLaws", "Xem danh sách văn bản luật")
    c.node("UC_ViewToc", "Xem mục lục (TOC) của luật")
    c.node("UC_SearchLaw", "Tìm kiếm / gợi ý văn bản luật")

  g.attr("edge", dir="none")
  g.edge("User", "UC_ViewLaws")
  g.edge("User", "UC_ViewToc")
  g.edge("User", "UC_SearchLaw")

  return g


def make_admin_users_usecase() -> Digraph:
  """
  Sơ đồ Use Case con: Quản lý người dùng cho Admin.
  """
  g = Digraph("VN_LAW_USECASE_ADMIN_USERS", filename="vn_law_usecase_admin_users", format="png")
  g.attr(rankdir="LR", splines="polyline", fontsize="11", fontname="Arial")
  g.attr("node", fontname="Arial")
  g.attr("edge", fontname="Arial")

  g.attr("node", shape="plaintext")
  g.node("Admin", "<<actor>>\nAdmin")

  with g.subgraph(name="cluster_admin_users") as c:
    c.attr(label="VN LAW - Quản lý người dùng", style="rounded", color="black", fontsize="12")
    c.attr("node", shape="ellipse")
    c.node("UC_ManageUsers", "Quản lý người dùng")
    c.node("UC_ManageRoles", "Gán / thay đổi vai trò")
    c.node("UC_LockUser", "Khoá / mở khoá tài khoản")

  g.attr("edge", dir="none")
  g.edge("Admin", "UC_ManageUsers")
  g.edge("Admin", "UC_ManageRoles")
  g.edge("Admin", "UC_LockUser")

  g.attr("edge", dir="forward", style="dashed", label="include")
  g.edge("UC_ManageUsers", "UC_ManageRoles")
  g.edge("UC_ManageUsers", "UC_LockUser")

  return g


def make_admin_corpus_usecase() -> Digraph:
  """
  Sơ đồ Use Case con: Quản lý corpus luật & RAG.
  """
  g = Digraph("VN_LAW_USECASE_ADMIN_CORPUS", filename="vn_law_usecase_admin_corpus", format="png")
  g.attr(rankdir="LR", splines="polyline", fontsize="11", fontname="Arial")
  g.attr("node", fontname="Arial")
  g.attr("edge", fontname="Arial")

  g.attr("node", shape="plaintext")
  g.node("Admin", "<<actor>>\nAdmin")

  with g.subgraph(name="cluster_admin_corpus") as c:
    c.attr(label="VN LAW - Corpus & RAG", style="rounded", color="black", fontsize="12")
    c.attr("node", shape="ellipse")
    c.node("UC_ManageCorpus", "Quản lý corpus luật")
    c.node("UC_UploadLaw", "Tải lên PDF/văn bản luật mới")
    c.node("UC_UpdateLawMeta", "Cập nhật metadata văn bản luật")
    c.node("UC_Reindex", "Yêu cầu reindex / embed lại")
    c.node("UC_ViewStats", "Xem thống kê truy vấn / sử dụng")
    c.node("UC_ViewStatus", "Theo dõi trạng thái RAG / LLM")

  g.attr("edge", dir="none")
  g.edge("Admin", "UC_ManageCorpus")
  g.edge("Admin", "UC_UploadLaw")
  g.edge("Admin", "UC_UpdateLawMeta")
  g.edge("Admin", "UC_Reindex")
  g.edge("Admin", "UC_ViewStats")
  g.edge("Admin", "UC_ViewStatus")

  g.attr("edge", dir="forward", style="dashed", label="include")
  g.edge("UC_ManageCorpus", "UC_UploadLaw")
  g.edge("UC_ManageCorpus", "UC_UpdateLawMeta")
  g.edge("UC_ManageCorpus", "UC_Reindex")

  return g


def main() -> None:
  diagrams = [
    make_overall_usecase(),
    make_user_usecase(),
    make_admin_usecase(),
    make_user_auth_usecase(),
    make_user_qa_usecase(),
    make_user_law_usecase(),
    make_admin_users_usecase(),
    make_admin_corpus_usecase(),
  ]
  for d in diagrams:
    path = d.render(cleanup=True)
    print(f"Rendered: {path}")


if __name__ == "__main__":
  main()
