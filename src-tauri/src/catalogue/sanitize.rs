//! HTML allowlist sanitiser (SPEC FR-26, §8.3 rule 9) — a port of the `San` class in
//! `reference/tools/build_data.py`, hardened per the catalogue skill.
//!
//! * Allowed tags: `p ul ol li h4 strong b em i br`, emitted with **no attributes**.
//! * `h1 h2 h3 h5 h6` are demoted to `h4`.
//! * The *contents* of `script style iframe object embed svg video audio noscript template`
//!   are dropped; every other unknown tag is unwrapped (its text kept).
//! * Text is entity-decoded, then re-escaped (`& < >`), so nothing in the output can open a tag.
//! * Empty `<p>`, `<li>`, `<h4>` are removed; the result is trimmed.
//!
//! The tokenizer is deliberately small and total: it never panics and never fails — malformed
//! markup degrades to text. The frontend renders the output with an allowlist component, never
//! `innerHTML`, so this is the first of two independent gates.

const ALLOWED: &[&str] = &["p", "ul", "ol", "li", "h4", "strong", "b", "em", "i", "br"];
const DEMOTE: &[&str] = &["h1", "h2", "h3", "h5", "h6"];
const DROP_CONTENT: &[&str] = &[
    "script", "style", "iframe", "object", "embed", "svg", "video", "audio", "noscript", "template",
];
/// Elements whose content is raw text in HTML: `</name>` is the only way out.
const RAW_TEXT: &[&str] = &["script", "style"];

pub fn sanitize(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }
    let mut out = String::with_capacity(input.len());
    let mut skip = 0usize;
    let mut text = String::new();
    let mut rest = input;

    let flush = |text: &mut String, out: &mut String, skip: usize| {
        if !text.is_empty() {
            if skip == 0 {
                escape_into(&decode_entities(text), out);
            }
            text.clear();
        }
    };

    while let Some(lt) = rest.find('<') {
        text.push_str(&rest[..lt]);
        let after = &rest[lt..];
        match parse_markup(after) {
            Some((Markup::Start { name, self_closing }, used)) => {
                flush(&mut text, &mut out, skip);
                rest = &after[used..];
                if RAW_TEXT.contains(&name.as_str()) && !self_closing {
                    // Raw text: skip straight to the matching close tag.
                    let close = format!("</{name}");
                    let end = find_ascii_ci(rest, &close).unwrap_or(rest.len());
                    rest = &rest[end..];
                    if let Some(gt) = rest.find('>') {
                        rest = &rest[gt + 1..];
                    }
                    continue;
                }
                start_tag(&name, &mut out, &mut skip);
                if self_closing {
                    end_tag(&name, &mut out, &mut skip);
                }
            }
            Some((Markup::End { name }, used)) => {
                flush(&mut text, &mut out, skip);
                rest = &after[used..];
                end_tag(&name, &mut out, &mut skip);
            }
            Some((Markup::Ignored, used)) => {
                flush(&mut text, &mut out, skip);
                rest = &after[used..];
            }
            None => {
                // A lone `<` is text (`a < b`).
                text.push('<');
                rest = &after[1..];
            }
        }
    }
    text.push_str(rest);
    flush(&mut text, &mut out, skip);

    remove_empty(&out).trim().to_string()
}

fn start_tag(name: &str, out: &mut String, skip: &mut usize) {
    if DROP_CONTENT.contains(&name) {
        *skip += 1;
    } else if *skip > 0 {
        // inside dropped content: nothing is emitted
    } else if DEMOTE.contains(&name) {
        out.push_str("<h4>");
    } else if ALLOWED.contains(&name) {
        out.push('<');
        out.push_str(name);
        out.push('>');
    }
}

fn end_tag(name: &str, out: &mut String, skip: &mut usize) {
    if DROP_CONTENT.contains(&name) {
        *skip = skip.saturating_sub(1);
    } else if *skip > 0 {
    } else if DEMOTE.contains(&name) {
        out.push_str("</h4>");
    } else if ALLOWED.contains(&name) && name != "br" {
        out.push_str("</");
        out.push_str(name);
        out.push('>');
    }
}

enum Markup {
    Start {
        name: String,
        self_closing: bool,
    },
    End {
        name: String,
    },
    /// Comments, doctype, processing instructions: dropped entirely.
    Ignored,
}

/// Parse one markup construct at the start of `s` (which begins with `<`).
/// Returns the construct and the number of bytes consumed, or `None` if `<` is plain text.
fn parse_markup(s: &str) -> Option<(Markup, usize)> {
    let bytes = s.as_bytes();
    let next = *bytes.get(1)?;
    if let Some(comment) = s.strip_prefix("<!--") {
        let end = comment.find("-->").map_or(s.len(), |i| 4 + i + 3);
        return Some((Markup::Ignored, end));
    }
    if next == b'!' || next == b'?' {
        let end = s.find('>').map_or(s.len(), |i| i + 1);
        return Some((Markup::Ignored, end));
    }
    let (is_end, name_start) = if next == b'/' { (true, 2) } else { (false, 1) };
    if !bytes.get(name_start)?.is_ascii_alphabetic() {
        return None;
    }
    let name_len = s[name_start..]
        .bytes()
        .take_while(|b| b.is_ascii_alphanumeric() || *b == b'-' || *b == b':')
        .count();
    let name = s[name_start..name_start + name_len].to_ascii_lowercase();
    let tag_end = find_tag_end(&s[name_start + name_len..])? + name_start + name_len;
    let inner = &s[name_start + name_len..tag_end];
    let used = tag_end + 1;
    if is_end {
        Some((Markup::End { name }, used))
    } else {
        let self_closing = inner.trim_end().ends_with('/');
        Some((Markup::Start { name, self_closing }, used))
    }
}

/// Index of the `>` closing a tag, honouring quoted attribute values (`title="a>b"`).
fn find_tag_end(s: &str) -> Option<usize> {
    let mut quote: Option<char> = None;
    for (i, ch) in s.char_indices() {
        match (quote, ch) {
            (Some(q), c) if c == q => quote = None,
            (Some(_), _) => {}
            (None, '"' | '\'') => quote = Some(ch),
            (None, '>') => return Some(i),
            _ => {}
        }
    }
    None
}

fn find_ascii_ci(haystack: &str, needle: &str) -> Option<usize> {
    let h = haystack.as_bytes();
    let n = needle.as_bytes();
    (0..=h.len().saturating_sub(n.len()))
        .find(|&i| h.len() >= i + n.len() && h[i..i + n.len()].eq_ignore_ascii_case(n))
}

fn escape_into(text: &str, out: &mut String) {
    for ch in text.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            c => out.push(c),
        }
    }
}

/// Decode numeric references and the named entities seen in scraped prose. Unknown names are
/// kept literally (they are then escaped, so they show as text — never as markup).
pub(crate) fn decode_entities(s: &str) -> String {
    if !s.contains('&') {
        return s.to_string();
    }
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    while let Some(amp) = rest.find('&') {
        out.push_str(&rest[..amp]);
        let tail = &rest[amp..];
        match decode_one(tail) {
            Some((ch, used)) => {
                out.push_str(&ch);
                rest = &tail[used..];
            }
            None => {
                out.push('&');
                rest = &tail[1..];
            }
        }
    }
    out.push_str(rest);
    out
}

fn decode_one(s: &str) -> Option<(String, usize)> {
    let body = &s[1..];
    if let Some(num) = body.strip_prefix('#') {
        let (digits, radix, skip) = match num.strip_prefix(['x', 'X']) {
            Some(hex) => (hex, 16, 3),
            None => (num, 10, 2),
        };
        let len = digits
            .chars()
            .take_while(|c| c.is_digit(radix))
            .map(char::len_utf8)
            .sum::<usize>();
        if len == 0 {
            return None;
        }
        let value = u32::from_str_radix(&digits[..len], radix).unwrap_or(0xFFFD);
        let ch = match value {
            0 | 0xD800..=0xDFFF => '\u{FFFD}',
            v => char::from_u32(v).unwrap_or('\u{FFFD}'),
        };
        let semi = usize::from(digits[len..].starts_with(';'));
        return Some((ch.to_string(), skip + len + semi));
    }
    let len = body.bytes().take_while(u8::is_ascii_alphanumeric).count();
    if len == 0 {
        return None;
    }
    let name = &body[..len];
    let has_semi = body[len..].starts_with(';');
    let decoded = named_entity(name)?;
    // HTML5 legacy: a handful of names decode without the semicolon.
    if !has_semi && !matches!(name, "amp" | "lt" | "gt" | "quot" | "nbsp" | "copy" | "reg") {
        return None;
    }
    Some((decoded.to_string(), 1 + len + usize::from(has_semi)))
}

fn named_entity(name: &str) -> Option<&'static str> {
    Some(match name {
        "amp" => "&",
        "lt" => "<",
        "gt" => ">",
        "quot" => "\"",
        "apos" => "'",
        "nbsp" => "\u{a0}",
        "copy" => "©",
        "reg" => "®",
        "trade" => "™",
        "hellip" => "…",
        "mdash" => "—",
        "ndash" => "–",
        "lsquo" => "‘",
        "rsquo" => "’",
        "ldquo" => "“",
        "rdquo" => "”",
        "sbquo" => "‚",
        "bdquo" => "„",
        "laquo" => "«",
        "raquo" => "»",
        "bull" => "•",
        "middot" => "·",
        "deg" => "°",
        "times" => "×",
        "divide" => "÷",
        "plusmn" => "±",
        "frac12" => "½",
        "frac14" => "¼",
        "frac34" => "¾",
        "sup2" => "²",
        "sup3" => "³",
        "euro" => "€",
        "pound" => "£",
        "yen" => "¥",
        "cent" => "¢",
        "sect" => "§",
        "para" => "¶",
        "eacute" => "é",
        "egrave" => "è",
        "ecirc" => "ê",
        "aacute" => "á",
        "agrave" => "à",
        "acirc" => "â",
        "auml" => "ä",
        "ouml" => "ö",
        "uuml" => "ü",
        "ccedil" => "ç",
        "ntilde" => "ñ",
        "iacute" => "í",
        "oacute" => "ó",
        "uacute" => "ú",
        "szlig" => "ß",
        "Eacute" => "É",
        "Auml" => "Ä",
        "Ouml" => "Ö",
        "Uuml" => "Ü",
        "shy" => "\u{ad}",
        "zwj" => "\u{200d}",
        "zwnj" => "\u{200c}",
        "ensp" => "\u{2002}",
        "emsp" => "\u{2003}",
        "thinsp" => "\u{2009}",
        _ => return None,
    })
}

/// `re.sub(r'<(p|li|h4)>\s*</\1>', '', r)` — one pass, like the reference.
fn remove_empty(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    'outer: while let Some(lt) = rest.find('<') {
        out.push_str(&rest[..lt]);
        let after = &rest[lt..];
        for tag in ["p", "li", "h4"] {
            let open = format!("<{tag}>");
            if let Some(inner) = after.strip_prefix(open.as_str()) {
                let ws = inner.len() - inner.trim_start().len();
                let close = format!("</{tag}>");
                if inner[ws..].starts_with(close.as_str()) {
                    rest = &inner[ws + close.len()..];
                    continue 'outer;
                }
            }
        }
        out.push('<');
        rest = &after[1..];
    }
    out.push_str(rest);
    out
}

#[cfg(test)]
mod tests {
    use super::sanitize;

    #[test]
    fn keeps_allowed_tags_and_strips_attributes() {
        assert_eq!(
            sanitize(r#"<p class="x" style="color:red">Hello <strong id=a>world</strong></p>"#),
            "<p>Hello <strong>world</strong></p>"
        );
        assert_eq!(
            sanitize("<ul><li>a</li><li>b</li></ul>"),
            "<ul><li>a</li><li>b</li></ul>"
        );
    }

    #[test]
    fn removes_xss_payloads() {
        // FR-26 AC: script, img onerror, iframe, javascript: links, inline handlers, style.
        let dirty = concat!(
            "<p>Intro</p>",
            "<script>alert('x')</script>",
            "<img src=x onerror=\"alert(1)\">",
            "<iframe src=\"https://evil\">frame text</iframe>",
            "<a href=\"javascript:alert(1)\">link text</a>",
            "<div onclick=\"steal()\">div text</div>",
            "<style>body{display:none}</style>",
            "<svg><script>alert(2)</script></svg>",
            "<object data=x>obj</object>",
        );
        let clean = sanitize(dirty);
        assert_eq!(clean, "<p>Intro</p>link textdiv text");
        for bad in [
            "script",
            "onerror",
            "iframe",
            "javascript",
            "onclick",
            "style",
            "svg",
            "<a",
            "<img",
        ] {
            assert!(!clean.contains(bad), "{bad} survived: {clean}");
        }
    }

    #[test]
    fn raw_text_script_cannot_smuggle_tags() {
        assert_eq!(
            sanitize("<script>var s = '<p>x</p>';</script><p>ok</p>"),
            "<p>ok</p>"
        );
        assert_eq!(sanitize("<SCRIPT>x</SCRIPT><p>ok</p>"), "<p>ok</p>");
        assert_eq!(sanitize("<p>a</p><script>never closed"), "<p>a</p>");
    }

    #[test]
    fn demotes_headings_and_unwraps_unknown_tags() {
        assert_eq!(
            sanitize("<h2>Title</h2><div><span>body</span></div>"),
            "<h4>Title</h4>body"
        );
        assert_eq!(sanitize("<H1>Big</H1>"), "<h4>Big</h4>");
    }

    #[test]
    fn decodes_then_escapes_text() {
        assert_eq!(
            sanitize("<p>Fish &amp; chips &lt;3</p>"),
            "<p>Fish &amp; chips &lt;3</p>"
        );
        assert_eq!(sanitize("<p>&lt;script&gt;</p>"), "<p>&lt;script&gt;</p>");
        assert_eq!(
            sanitize("<p>It&#39;s &rsquo;fine&rsquo; &#x2014; ok</p>"),
            "<p>It's ’fine’ — ok</p>"
        );
        assert_eq!(sanitize("<p>a < b > c</p>"), "<p>a &lt; b &gt; c</p>");
        assert_eq!(
            sanitize("<p>&unknown; &amp</p>"),
            "<p>&amp;unknown; &amp;</p>"
        );
    }

    #[test]
    fn removes_empty_blocks_and_trims() {
        assert_eq!(
            sanitize("  <p> </p><li></li><p>x</p><h4>\n</h4>  "),
            "<p>x</p>"
        );
        assert_eq!(sanitize("<br/><p>a<br>b</p>"), "<br><p>a<br>b</p>");
        assert_eq!(sanitize(""), "");
        assert_eq!(sanitize("<!-- note --><p>a</p><!DOCTYPE html>"), "<p>a</p>");
    }

    #[test]
    fn quoted_gt_inside_attribute_does_not_end_the_tag() {
        assert_eq!(sanitize(r#"<p title="a>b">x</p>"#), "<p>x</p>");
    }
}
