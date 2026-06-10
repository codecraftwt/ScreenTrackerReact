const CLAIMS = {
    id: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
    name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
};

const decodeBase64Url = (value) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
    return decodeURIComponent(
        atob(padded)
            .split('')
            .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
            .join('')
    );
};

export const decodeToken = (token) => {
    if (!token || typeof token !== 'string') return null;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const decoded = JSON.parse(decodeBase64Url(parts[1]));
        const userId = decoded[CLAIMS.id] || decoded.nameid || decoded.id || decoded.sub;
        const userName = decoded[CLAIMS.name] || decoded.unique_name || decoded.name || decoded.email;
        const userRole = decoded[CLAIMS.role] || decoded.role || decoded.roles;
        const role = Array.isArray(userRole) ? userRole[0] : userRole;

        return {
            ...decoded,
            id: userId ? Number(userId) : null,
            name: userName || 'User',
            role: role ? String(role).toLowerCase() : ''
        };
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

export const isTokenExpired = (token) => {
    const decoded = decodeToken(token);
    if (!decoded?.exp) return false;
    return decoded.exp * 1000 <= Date.now();
};
