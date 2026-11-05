// Gedeeld door "Nieuwe klant" en het overzicht van een klant.
export function generatePassword(length = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const values = new Uint32Array(length);
    const result = [];
    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(values);
        for (let i = 0; i < length; i += 1) result.push(chars[values[i] % chars.length]);
    } else {
        for (let i = 0; i < length; i += 1) result.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    return result.join('');
}
