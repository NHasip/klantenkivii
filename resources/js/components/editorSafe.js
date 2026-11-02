/**
 * Veilige toegang tot een TipTap-editor. useEditor kan (vooral in WebKit/iOS, door andere timing) in een effect of
 * handler nog een oud exemplaar teruggeven dat al vernietigd is: schema en state zijn dan null en getHTML() gooit
 * "null is not an object (evaluating 'schema.cached')". Dat liet de hele pagina leeg achter.
 */
export function isEditorUsable(editor) {
    return Boolean(editor && !editor.destroyed && editor.schema && editor.state);
}

export function safeGetHTML(editor, fallback = '') {
    if (!isEditorUsable(editor)) return fallback;
    try {
        return editor.getHTML();
    } catch (e) {
        return fallback;
    }
}

export function safeSetContent(editor, html, options = false) {
    if (!isEditorUsable(editor)) return false;
    try {
        editor.commands.setContent(html, options);
        return true;
    } catch (e) {
        return false;
    }
}
