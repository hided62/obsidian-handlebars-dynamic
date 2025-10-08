export function quoteattr(s : string, preserveCR?: boolean) {
    const cr = preserveCR ? '&#13;' : '\n';
    return ('' + s) /* Forces the conversion to string. */
        .replace(/&/g, '&amp;') /* This MUST be the 1st replacement. */
        .replace(/'/g, '&apos;') /* The 4 other predefined entities, required. */
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        /*
        You may add other replacements here for HTML only
        (but it's not necessary).
        Or for XML, only if the named entities are defined in its DTD.
        */
        .replace(/\r\n/g, cr) /* Must be before the next replacement. */
        .replace(/[\r\n]/g, cr);
}

export function rtrimPath(s : string) {
    const re = /\/?\s*$/;
    return s.replace(re, '');
}