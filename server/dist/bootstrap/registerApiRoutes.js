import routes from '../routes/index.js';
/** Core REST API under `/api` (health, follow, blog, analytics, …). */
export function registerApiRoutes(app) {
    app.use('/api', routes);
}
//# sourceMappingURL=registerApiRoutes.js.map