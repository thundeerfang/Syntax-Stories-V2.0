import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../theme/app_color_tokens.dart';
import '../../utils/skill_icons.dart';

/// Skill icon — prefers [iconUrl] from API, falls back to local slug map.
///
/// skillicons.dev serves nested SVG; we fetch and flatten before rendering.
class SkillIconImage extends StatefulWidget {
  const SkillIconImage({
    super.key,
    required this.name,
    this.slug,
    this.iconUrl,
    this.size = 20,
  });

  final String name;
  final String? slug;
  final String? iconUrl;
  final double size;

  @override
  State<SkillIconImage> createState() => _SkillIconImageState();
}

class _SkillIconImageState extends State<SkillIconImage> {
  String? _svgMarkup;
  bool _failed = false;
  String _loadedUrl = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant SkillIconImage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_resolveUrl(oldWidget) != _resolveUrl(widget)) {
      _load();
    }
  }

  String _resolveUrl([SkillIconImage? source]) {
    final w = source ?? widget;
    final fromApi = w.iconUrl?.trim();
    if (fromApi != null && fromApi.isNotEmpty) return fromApi;
    if (w.slug != null && w.slug!.trim().isNotEmpty) return skillIconUrlBySlug(w.slug!);
    return skillIconUrl(w.name);
  }

  Future<void> _load() async {
    final url = _resolveUrl();
    if (url.isEmpty) {
      if (mounted) {
        setState(() {
          _loadedUrl = '';
          _svgMarkup = null;
          _failed = false;
        });
      }
      return;
    }

    if (!isSkillIconSvgUrl(url)) {
      if (mounted) {
        setState(() {
          _loadedUrl = url;
          _svgMarkup = null;
          _failed = false;
        });
      }
      return;
    }

    if (mounted) {
      setState(() {
        _loadedUrl = url;
        _svgMarkup = null;
        _failed = false;
      });
    }

    final svg = await fetchSkillIconSvg(url);
    if (!mounted || _resolveUrl() != url) return;
    setState(() {
      _svgMarkup = svg;
      _failed = svg == null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final url = _resolveUrl();

    if (url.isEmpty || _failed) {
      return _fallbackIcon(context);
    }

    if (!isSkillIconSvgUrl(url)) {
      return Image.network(
        url,
        width: widget.size,
        height: widget.size,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) => _fallbackIcon(context),
      );
    }

    if (_svgMarkup == null || _loadedUrl != url) {
      return SizedBox(
        width: widget.size,
        height: widget.size,
        child: Center(
          child: SizedBox(
            width: widget.size * 0.55,
            height: widget.size * 0.55,
            child: CircularProgressIndicator(
              strokeWidth: 1.5,
              color: context.appColors.mutedForeground.withValues(alpha: 0.45),
            ),
          ),
        ),
      );
    }

    return SvgPicture.string(
      _svgMarkup!,
      width: widget.size,
      height: widget.size,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) => _fallbackIcon(context),
    );
  }

  Widget _fallbackIcon(BuildContext context) {
    return Icon(
      Icons.code_rounded,
      size: widget.size * 0.75,
      color: context.appColors.mutedForeground,
    );
  }
}
