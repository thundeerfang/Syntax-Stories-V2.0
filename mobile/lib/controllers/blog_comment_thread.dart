import 'package:flutter/foundation.dart';

import '../models/blog_comment.dart';
import '../services/blog_api.dart';

class ReplyBranchState {
  const ReplyBranchState({
    this.expanded = false,
    this.childIds = const [],
    this.offset = 0,
    this.hasMore = false,
    this.loading = false,
  });

  final bool expanded;
  final List<String> childIds;
  final int offset;
  final bool hasMore;
  final bool loading;

  ReplyBranchState copyWith({
    bool? expanded,
    List<String>? childIds,
    int? offset,
    bool? hasMore,
    bool? loading,
  }) {
    return ReplyBranchState(
      expanded: expanded ?? this.expanded,
      childIds: childIds ?? this.childIds,
      offset: offset ?? this.offset,
      hasMore: hasMore ?? this.hasMore,
      loading: loading ?? this.loading,
    );
  }
}

class BlogCommentThreadController extends ChangeNotifier {
  BlogCommentThreadController({
    required BlogApi api,
    required this.username,
    required this.slug,
    this.accessToken,
  }) : _api = api;

  final BlogApi _api;
  final String username;
  final String slug;
  String? accessToken;

  final Map<String, BlogComment> _byId = {};
  final List<String> _rootIds = [];
  final Map<String, ReplyBranchState> _branches = {};

  int _rootOffset = 0;
  bool _rootHasMore = false;
  int _rootTotal = 0;
  int _postTotal = 0;
  bool _rootsLoading = true;
  bool _rootsLoadingMore = false;
  int _loadSeq = 0;

  Map<String, BlogComment> get byId => Map.unmodifiable(_byId);
  List<String> get rootIds => List.unmodifiable(_rootIds);
  Map<String, ReplyBranchState> get branches => Map.unmodifiable(_branches);
  int get postTotal => _postTotal;
  int get rootTotal => _rootTotal;
  bool get rootsLoading => _rootsLoading;
  bool get rootsLoadingMore => _rootsLoadingMore;
  bool get rootHasMore => _rootHasMore;

  BlogComment? commentById(String? id) {
    if (id == null || id.isEmpty) return null;
    return _byId[id];
  }

  void updateAccessToken(String? token) {
    accessToken = token;
  }

  void _mergeComments(Iterable<BlogComment> list) {
    for (final c in list) {
      _byId[c.id] = c;
    }
  }

  List<String> _appendUniqueIds(List<String> prev, List<String> ids) {
    final seen = prev.toSet();
    final out = [...prev];
    for (final id in ids) {
      if (seen.add(id)) out.add(id);
    }
    return out;
  }

  void _resetThread() {
    _byId.clear();
    _rootIds.clear();
    _branches.clear();
    _rootOffset = 0;
    _rootHasMore = false;
    _rootTotal = 0;
  }

  Future<void> loadRoots({bool replace = true}) async {
    final seq = ++_loadSeq;
    if (replace) {
      _rootsLoading = true;
      _resetThread();
      notifyListeners();
    } else {
      _rootsLoadingMore = true;
      notifyListeners();
    }

    try {
      final page = await _api.fetchComments(
        username: username,
        slug: slug,
        limit: kCommentPageSize,
        offset: replace ? 0 : _rootOffset,
        accessToken: accessToken,
      );
      if (seq != _loadSeq) return;
      _mergeComments(page.comments);
      if (replace) {
        _rootIds
          ..clear()
          ..addAll(page.comments.map((c) => c.id));
      } else {
        _rootIds.addAll(
          page.comments.map((c) => c.id).where((id) => !_rootIds.contains(id)),
        );
      }
      _rootOffset = page.offset + page.comments.length;
      _rootHasMore = page.hasMore;
      _rootTotal = page.total;
      _postTotal = page.postTotal;
    } finally {
      if (seq == _loadSeq) {
        _rootsLoading = false;
        _rootsLoadingMore = false;
        notifyListeners();
      }
    }
  }

  Future<void> loadMoreRoots() async {
    if (_rootsLoading || _rootsLoadingMore || !_rootHasMore) return;
    await loadRoots(replace: false);
  }

  Future<void> toggleReplies(String parentId) async {
    final branch = _branches[parentId];
    if (branch?.expanded == true) {
      _branches[parentId] = branch!.copyWith(expanded: false);
      notifyListeners();
      return;
    }
    await _ensureRepliesLoaded(parentId, expand: true);
  }

  Future<void> _ensureRepliesLoaded(String parentId, {required bool expand}) async {
    final branch = _branches[parentId];
    if (expand && branch != null && branch.childIds.isNotEmpty) {
      _branches[parentId] = branch.copyWith(expanded: true);
      notifyListeners();
      return;
    }

    _branches[parentId] = (branch ?? const ReplyBranchState()).copyWith(
      expanded: expand || branch?.expanded == true,
      loading: true,
    );
    notifyListeners();

    try {
      final page = await _api.fetchComments(
        username: username,
        slug: slug,
        parentId: parentId,
        limit: kCommentPageSize,
        offset: branch?.offset ?? 0,
        accessToken: accessToken,
      );
      _mergeComments(page.comments);
      final cur = _branches[parentId] ?? const ReplyBranchState();
      _branches[parentId] = cur.copyWith(
        expanded: expand || cur.expanded,
        childIds: _appendUniqueIds(
          cur.childIds,
          page.comments.map((c) => c.id).toList(),
        ),
        offset: page.offset + page.comments.length,
        hasMore: page.hasMore,
        loading: false,
      );
    } catch (_) {
      final cur = _branches[parentId];
      if (cur != null) {
        _branches[parentId] = cur.copyWith(loading: false);
      }
      rethrow;
    } finally {
      notifyListeners();
    }
  }

  Future<void> loadMoreReplies(String parentId) async {
    final branch = _branches[parentId];
    if (branch == null || branch.loading || !branch.hasMore) return;

    _branches[parentId] = branch.copyWith(loading: true);
    notifyListeners();

    try {
      final page = await _api.fetchComments(
        username: username,
        slug: slug,
        parentId: parentId,
        limit: kCommentPageSize,
        offset: branch.offset,
        accessToken: accessToken,
      );
      _mergeComments(page.comments);
      _branches[parentId] = branch.copyWith(
        childIds: _appendUniqueIds(
          branch.childIds,
          page.comments.map((c) => c.id).toList(),
        ),
        offset: page.offset + page.comments.length,
        hasMore: page.hasMore,
        loading: false,
      );
    } catch (_) {
      _branches[parentId] = branch.copyWith(loading: false);
      rethrow;
    } finally {
      notifyListeners();
    }
  }

  Future<void> expandAncestors(String commentId) async {
    var current = _byId[commentId];
    final chain = <String>[];
    while (current?.parentId != null && current!.parentId!.isNotEmpty) {
      chain.insert(0, current.parentId!);
      current = _byId[current.parentId!];
    }
    for (final parentId in chain) {
      await _ensureRepliesLoaded(parentId, expand: true);
    }
  }

  void upsertComment(BlogComment comment) {
    _byId[comment.id] = comment;
    notifyListeners();
  }

  Future<void> onCommentPosted(BlogComment comment) async {
    upsertComment(comment);
    _postTotal += 1;
    if (comment.parentId == null || comment.parentId!.isEmpty) {
      _rootIds.add(comment.id);
      _rootTotal += 1;
      notifyListeners();
      return;
    }
    final parentId = comment.parentId!;
    final parent = _byId[parentId];
    if (parent != null) {
      _byId[parentId] = BlogComment(
        id: parent.id,
        text: parent.text,
        createdAt: parent.createdAt,
        author: parent.author,
        authorUserId: parent.authorUserId,
        parentId: parent.parentId,
        likeCount: parent.likeCount,
        likedByViewer: parent.likedByViewer,
        editedAt: parent.editedAt,
        directReplyCount: parent.directReplyCount + 1,
      );
    }
    final branch = _branches[parentId];
    if (branch?.expanded == true) {
      _branches[parentId] = branch!.copyWith(
        childIds: _appendUniqueIds(branch.childIds, [comment.id]),
      );
    } else {
      await _ensureRepliesLoaded(parentId, expand: true);
      final cur = _branches[parentId];
      if (cur != null) {
        _branches[parentId] = cur.copyWith(
          childIds: _appendUniqueIds(cur.childIds, [comment.id]),
        );
      }
    }
    notifyListeners();
  }

  void patchComment(BlogComment comment) => upsertComment(comment);

  void patchLike(String commentId, {required int likeCount, required bool likedByViewer}) {
    final cur = _byId[commentId];
    if (cur == null) return;
    _byId[commentId] = cur.copyWith(likeCount: likeCount, likedByViewer: likedByViewer);
    notifyListeners();
  }
}
