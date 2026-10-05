"""Testfälle für scripts/build-report.py."""

import importlib.util
import os
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("build_report", os.path.join(HERE, "..", "build-report.py"))
br = importlib.util.module_from_spec(spec)
spec.loader.exec_module(br)


class BuildReportTest(unittest.TestCase):

    def test_first_run(self):
        text = br.render(({}, set()), ({"index.html": "a", "css/x.css": "b"}, {"https://youtu.be/x"}))
        self.assertIn("Erster Lauf", text)
        self.assertIn("| Dateien gesamt | 2 |", text)
        self.assertIn("- <https://youtu.be/x>", text)
        self.assertNotIn("### Geänderte Dateien", text)

    def test_changes_and_new_links(self):
        old = ({"index.html": "a", "alt.html": "c", "same.css": "s"}, {"https://youtu.be/x"})
        new = ({"index.html": "b", "neu.html": "d", "same.css": "s"}, {"https://youtu.be/x", "https://youtu.be/y"})
        text = br.render(old, new)
        self.assertIn("| neu | `neu.html` |", text)
        self.assertIn("| geändert | `index.html` |", text)
        self.assertIn("| entfernt | `alt.html` |", text)
        self.assertNotIn("same.css", text)
        self.assertIn("- <https://youtu.be/y>", text)
        self.assertNotIn("- <https://youtu.be/x>", text)

    def test_long_lists_are_cut(self):
        new = ({"f%03d.html" % i: "x" for i in range(250)}, set())
        text = br.render(({"keep.html": "k"}, set()), new)
        self.assertIn("| … | 51 weitere |", text)


if __name__ == "__main__":
    unittest.main()
