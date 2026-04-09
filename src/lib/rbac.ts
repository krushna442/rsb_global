export const ALL_ROUTES = [
    "/",
    "/product-master",
    "/approvals", // Production Approval
    "/production-verification",
    "/quality-verification",
    "/documents",
    "/product-specifications",
    "/dynamic-fields",
    "/scanned-products",
    "/users",
    "/settings"
];

export const ROLE_ACCESS: Record<string, string[]> = {
    "super admin": ALL_ROUTES,
    
    "admin": [
        "/",
        "/product-master",
        "/production-verification",
        "/documents",
        "/product-specifications",
        "/dynamic-fields",
        "/scanned-products",
        "/users",
        "/settings"
    ],
    
    "production": [
        "/",
        "/product-master",
        "/approvals",
        "/production-verification",
        "/documents",
        "/product-specifications",
        "/scanned-products",
        "/settings"
    ],
    
    "quality": [
        "/",
        "/product-master",
        "/quality-verification",
        "/production-verification",
        "/documents",
        "/product-specifications",
        "/scanned-products",
        "/settings"
    ],
    
    "viewer": [
        "/",
        "/production-verification",
        "/documents",
        "/product-specifications",
        "/scanned-products",
        "/settings"
    ]
};

/**
 * Validates if the given role has access to the specified pathname.
 * Sub-paths like /users/create will technically match /users if configured carefully,
 * but currently our app uses top-level routes.
 */
export function hasAccess(role: string | undefined | null, pathname: string): boolean {
    if (!role) return false;
    
    // Normalize role
    const normalizedRole = role.toLowerCase();
    
    // Get allowed routes for role, default to empty array
    const allowedRoutes = ROLE_ACCESS[normalizedRole] || [];
    
    // Check if the current exact pathname is in the allowed routes.
    // Dashboard is "/"
    if (pathname === "/") {
        return allowedRoutes.includes("/");
    }

    // For other paths, verify if the current pathname starts with any of the valid base paths
    // e.g., if /product-master is allowed, then /product-master/123 is allowed
    return allowedRoutes.some((route) => route !== "/" && pathname.startsWith(route));
}
