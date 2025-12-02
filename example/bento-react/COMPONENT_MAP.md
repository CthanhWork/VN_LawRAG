# Bento React – Component Map

Tổng quan nhanh các file chính dựng giao diện và route của dự án.

## Router & Layout
- Router: `src/routers/app-router.tsx` dùng `createBrowserRouter`. `errorElement` là `src/pages/error/error-page.tsx`.
- Layout gốc: `src/layouts/main-layout.tsx` (chèn `Sidebar` desktop, `BottomNavigationBar` mobile, phát sự kiện tạo post). Các trang có sidebar phải dùng `src/layouts/sbs-layout.tsx` bọc `<Outlet />` cùng `SidebarRight`.
- Sidebar trái: `src/layouts/components/sidebar.tsx` (nav từ `navigation-items.tsx`, info user, nút Post mở overlay `pages/home/creat-post.tsx`).
- Sidebar phải: `src/layouts/components/sidebar-right.tsx` (tabs Who to follow/Trending hoặc luôn trending ở `/following`).
- Mobile nav: `src/layouts/components/bottom-navigation-bar.tsx`; menu trái mobile `src/layouts/components/mobile-sidebar.tsx` mở qua `src/components/sidebar-trigger/mobile-sidebar-trigger.tsx`.

## Route → Component hiển thị
- `/login` → `src/pages/auth/login.tsx` (form đăng nhập, Input, avatar group).
- `/register` → `src/pages/auth/register.tsx` (form đăng ký).
- `/` (Home, có sidebar phải) → `src/pages/home/home.tsx` (header mobile, `ToggleGroup`, `SearchBar`, `ComposerInput`, danh sách `Post` từ mock; overlay tạo bài `pages/home/creat-post.tsx`).
- `/notifications` (có sidebar phải) → `src/pages/notifications/notifications.tsx` (AppBar back/setting, `Tabbar`, `NotificationList`).
- `/posts/:id` (có sidebar phải) → `src/pages/post-detail/post-detail.tsx` (SubHeader back/expand; `Post` + danh sách `Comment` + `ComposerInput` reply).
- `/users/:id` (có sidebar phải) → `src/pages/profile/profile.tsx` (ProfileHeader, `Cover`, `UserInfo`, `ToggleGroup` + `Newfeed`).
- `/users/:id/edit` (có sidebar phải) → `src/pages/edit-profile/edit-profile.tsx` (ProfileHeader, `Cover` chỉnh avatar, `UserEditForm`).
- `/following` (có sidebar phải) → `src/pages/following/following.tsx` (back + `ToggleGroup` Follower/Following + list `ProfileCard`).
- `/explore` (có sidebar phải) → `src/pages/explore/explore.tsx` (back, `ToggleGroup`, `SearchBar`, `TagsBar`, grid `ExploreCard`).
- `/explore/:id` (có sidebar phải) → `src/pages/explore-detail/explore-detail.tsx` (ExploreHeader, `Cover`, `ExploreInfo`, `ToggleGroup`, `Newfeed`).
- `/settings` (không sidebar phải) → `src/pages/settings/settings.tsx` (list `SETTINGS` bên trái, nội dung theo query `view`: `AccountsSection`, `NotificationsSection`; overlay mobile).
- `/messages/*` (không sidebar phải) → `src/pages/message/message.tsx` (cột trái `ConversationSidebar`, chi tiết `ConversationDetail` + `MessageItem` + `ChatInput`; state rỗng “Select conversation”).
- `/bookmarks/*` (không sidebar phải) → `src/pages/bookmarks/bookmarks.tsx` (cột trái `BookmarkFolder`, chi tiết `BookmarkItems` với `ToggleGroup` Post/Media, `ListItem` dùng `BMPostItem` hoặc grid ảnh; empty-state).

## Thành phần chia sẻ đáng chú ý
- Bài viết & tương tác: `src/components/post/post.tsx` (card Post + like/repost/comment/share/bookmark; click ảnh đi chi tiết), `src/components/post/react-item.tsx`.
- Ô soạn nội dung: `src/components/composer-input/composer-input.tsx` (avatar + input + emoji/image/gif/tag), dùng ở Home và Post detail.
- Chuyển tab/toggle: `src/components/toggle-group/toggle-group.tsx`, `src/components/tabbar/tabbar.tsx`.
- Thẻ nội dung: `src/components/explore-card/explore-card.tsx`, `src/components/trending-topic-card/trending-topic-card.tsx`, `src/components/profile-card/profile-card.tsx`.
- Settings & notifications: `src/components/appbar/appbar.tsx`, `src/components/setting-card/*`, `src/components/list-tile/list-tile.tsx`, `src/components/notification-banner/notification-banner.tsx`, `src/pages/notifications/components/notification-list*.tsx`.
- Navbar: `src/layouts/components/navigationbar.tsx` + cấu hình item `navigation-items.tsx` (dùng cho sidebar trái và bottom nav).
