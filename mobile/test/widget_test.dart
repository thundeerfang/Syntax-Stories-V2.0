import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:syntax_stories_app/app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('shows Syntax Stories shell after bootstrap', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const SyntaxStoriesApp());
    await tester.pumpAndSettle();
    expect(find.textContaining('SYNTAX'), findsOneWidget);
  });
}
