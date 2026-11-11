import {defineConfig, type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// API lưu dự án vào file project.json trong thư mục remotion-app, dùng chung cho mọi trình duyệt.
const projectFile = path.resolve(process.cwd(), 'project.json');

const projectApi = (): Plugin => ({
	name: 'project-api',
	configureServer(server) {
		server.middlewares.use('/api/project', (req, res) => {
			res.setHeader('Content-Type', 'application/json');
			if (req.method === 'GET') {
				res.end(fs.existsSync(projectFile) ? fs.readFileSync(projectFile, 'utf-8') : 'null');
				return;
			}
			if (req.method === 'POST') {
				let body = '';
				req.on('data', (c) => (body += c));
				req.on('end', () => {
					fs.writeFileSync(projectFile, body, 'utf-8');
					res.end('{"ok":true}');
				});
				return;
			}
			res.statusCode = 405;
			res.end('{}');
		});
	},
});

export default defineConfig({
	root: 'editor',
	publicDir: '../public',
	plugins: [react(), projectApi()],
	server: {port: 5173, open: true},
	define: {'process.env.NODE_ENV': JSON.stringify('development')},
});
