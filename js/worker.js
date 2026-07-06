export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		const ALLOWED_ORIGINS = env.FRONTEND_URL ? env.FRONTEND_URL.split(",").map(o => o.trim()) : [];
		const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "123456";

		function getCorsHeaders(request) {
			const origin = request.headers.get("Origin");
			if (origin && ALLOWED_ORIGINS.includes(origin)) {
				return {
					"Access-Control-Allow-Origin": origin,
					"Access-Control-Allow-Methods": "GET, POST, DELETE, PUT, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Allow-Credentials": "true",
				};
			}
			return {
				"Access-Control-Allow-Methods": "GET, POST, DELETE, PUT, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			};
		}

		if (method === "OPTIONS") {
			const corsHeaders = getCorsHeaders(request);
			return new Response(null, {
				status: 204,
				headers: corsHeaders
			});
		}

		function isValidOrigin(request) {
			const origin = request.headers.get("Origin");
			if (!origin) return true;
			return ALLOWED_ORIGINS.includes(origin);
		}

		if (!isValidOrigin(request)) {
			return new Response(JSON.stringify({
				error: "Forbidden"
			}), {
				status: 403,
				headers: {
					...getCorsHeaders(request),
					"Content-Type": "application/json"
				}
			});
		}

		const REDIS_URL = env.UPSTASH_REST_URL;
		const REDIS_TOKEN = env.UPSTASH_REST_TOKEN;

		async function redisCommand(command, ...args) {
			const body = JSON.stringify([command, ...args]);
			const response = await fetch(REDIS_URL, {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${REDIS_TOKEN}`,
					"Content-Type": "application/json"
				},
				body: body,
			});
			const data = await response.json();
			return data.result;
		}

		function isAuthorized(request) {
			const authHeader = request.headers.get("Authorization");
			return authHeader === `Bearer ${ADMIN_PASSWORD}`;
		}

		// ========== 默认数据 ==========
		const DEFAULT_MENU = [{
				"name": "热搜新闻",
				"icon": "🔥"
			},
			{
				"name": "常用站点",
				"icon": "⭐"
			},
			{
				"name": "字母站",
				"icon": "💎"
			},
			{
				"name": "实用工具",
				"icon": "👍"
			},
			{
				"name": "素材资源",
				"icon": "📷"
			},
			{
				"name": "开发生产",
				"icon": "📄"
			},
			{
				"name": "学无止境",
				"icon": "🎓"
			},
			{
				"name": "系统相关",
				"icon": "💻"
			},
			{
				"name": "在线追剧",
				"icon": "📺"
			},
			{
				"name": "搜索引擎",
				"icon": "🔍"
			}
		];

		const DEFAULT_BOOKMARKS = [];
		// ========== 根路径 ==========
		if (path === "/" && method === "GET") {
			return new Response(JSON.stringify({
				name: "Arley's Bookmark API",
				status: "running",
				version: "2.0.0"
			}), {
				status: 200,
				headers: {
					...getCorsHeaders(request),
					"Content-Type": "application/json"
				}
			});
		}

		// ========== 健康检查 ==========
		if (path === "/health" && method === "GET") {
			return new Response(JSON.stringify({
				status: "ok",
				timestamp: new Date().toISOString()
			}), {
				status: 200,
				headers: getCorsHeaders(request)
			});
		}

		// ========== 书签 API ==========

		// 获取书签（公开）
		if (path === "/api/bookmarks" && method === "GET") {
			try {
				let menu = await redisCommand("GET", "menu");
				let bookmarks = await redisCommand("GET", "bookmarks");
				if (!menu) {
					menu = DEFAULT_MENU;
					await redisCommand("SET", "menu", JSON.stringify(menu));
				}
				if (!bookmarks) {
					bookmarks = DEFAULT_BOOKMARKS;
					await redisCommand("SET", "bookmarks", JSON.stringify(bookmarks));
				}
				if (typeof menu === "string") menu = JSON.parse(menu);
				if (typeof bookmarks === "string") bookmarks = JSON.parse(bookmarks);
				return new Response(JSON.stringify({
					success: true,
					data: {
						menu,
						bookmarks
					}
				}), {
					status: 200,
					headers: {
						...getCorsHeaders(request),
						"Content-Type": "application/json"
					}
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		// 获取书签（管理用）
		if (path === "/api/admin/bookmarks" && method === "GET") {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({
					success: false,
					error: "未授权"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			}
			try {
				let menu = await redisCommand("GET", "menu");
				let bookmarks = await redisCommand("GET", "bookmarks");
				if (!menu) menu = DEFAULT_MENU;
				if (!bookmarks) bookmarks = DEFAULT_BOOKMARKS;
				if (typeof menu === "string") menu = JSON.parse(menu);
				if (typeof bookmarks === "string") bookmarks = JSON.parse(bookmarks);
				return new Response(JSON.stringify({
					success: true,
					data: {
						menu,
						bookmarks
					}
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		// 添加书签
		if (path === "/api/admin/bookmarks" && method === "POST") {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({
					success: false,
					error: "未授权"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			}
			try {
				const {
					category,
					subcategory,
					name,
					url,
					desc
				} = await request.json();
				if (!category || !name || !url) {
					return new Response(JSON.stringify({
						success: false,
						error: "参数不完整：分类、标题、网址为必填"
					}), {
						status: 400,
						headers: getCorsHeaders(request)
					});
				}

				let bookmarks = await redisCommand("GET", "bookmarks");
				if (!bookmarks) bookmarks = [];
				if (typeof bookmarks === "string") bookmarks = JSON.parse(bookmarks);

				// 查找或创建分类
				let categoryData = bookmarks.find(c => c.category === category);
				if (!categoryData) {
					categoryData = {
						category: category,
						subcategories: []
					};
					bookmarks.push(categoryData);
				}

				// 如果有子分类
				if (subcategory && subcategory.trim()) {
					let subcategoryData = categoryData.subcategories.find(s => s.name === subcategory);
					if (!subcategoryData) {
						subcategoryData = {
							name: subcategory,
							bookmarks: []
						};
						categoryData.subcategories.push(subcategoryData);
					}
					subcategoryData.bookmarks.push({
						name: name.trim(),
						url: url.trim(),
						desc: desc || ""
					});
				}
				// 无子分类，直接添加到分类下
				else {
					if (!categoryData.bookmarks) categoryData.bookmarks = [];
					categoryData.bookmarks.push({
						name: name.trim(),
						url: url.trim(),
						desc: desc || ""
					});
				}

				await redisCommand("SET", "bookmarks", JSON.stringify(bookmarks));
				return new Response(JSON.stringify({
					success: true,
					message: "添加成功"
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				console.error("添加书签错误:", err);
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}
		// 更新书签（完整替换）
		if (path === "/api/admin/bookmarks" && method === "PUT") {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({
					success: false,
					error: "未授权"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			}
			try {
				const {
					bookmarks
				} = await request.json();
				await redisCommand("SET", "bookmarks", JSON.stringify(bookmarks || []));
				return new Response(JSON.stringify({
					success: true,
					message: "更新成功"
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}
		// 删除书签
		if (path.startsWith("/api/admin/bookmarks/") && method === "DELETE") {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({
					success: false,
					error: "未授权"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			}
			try {
				const parts = path.split("/");
				const category = decodeURIComponent(parts[4]);
				const subcategory = parts[5] ? decodeURIComponent(parts[5]) : null;
				const index = parseInt(parts[6] || parts[5]);

				let bookmarks = await redisCommand("GET", "bookmarks");
				if (typeof bookmarks === "string") bookmarks = JSON.parse(bookmarks);

				const categoryIndex = bookmarks.findIndex(c => c.category === category);
				if (categoryIndex === -1) {
					return new Response(JSON.stringify({
						success: false,
						error: "分类不存在"
					}), {
						status: 404,
						headers: getCorsHeaders(request)
					});
				}

				if (subcategory) {
					const subcategoryIndex = bookmarks[categoryIndex].subcategories.findIndex(s => s.name === subcategory);
					if (subcategoryIndex !== -1 && index >= 0 && index < bookmarks[categoryIndex].subcategories[subcategoryIndex].bookmarks.length) {
						bookmarks[categoryIndex].subcategories[subcategoryIndex].bookmarks.splice(index, 1);
					}
				} else {
					if (index >= 0 && index < bookmarks[categoryIndex].bookmarks.length) {
						bookmarks[categoryIndex].bookmarks.splice(index, 1);
					}
				}

				await redisCommand("SET", "bookmarks", JSON.stringify(bookmarks));
				return new Response(JSON.stringify({
					success: true,
					message: "删除成功"
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		// ========== 留言 API ==========

		if (path === "/api/messages" && method === "GET") {
			try {
				let messages = await redisCommand("GET", "messages");
				if (!messages) messages = [];
				if (typeof messages === "string") messages = JSON.parse(messages);
				const approvedMessages = messages.filter(m => m.status === "approved");
				return new Response(JSON.stringify({
					success: true,
					messages: approvedMessages
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		if (path === "/api/messages" && method === "POST") {
			try {
				const {
					nickname,
					content,
					recommendUrl
				} = await request.json();
				if (!nickname || !content) {
					return new Response(JSON.stringify({
						success: false,
						error: "昵称和内容不能为空"
					}), {
						status: 400,
						headers: getCorsHeaders(request)
					});
				}

				let messages = await redisCommand("GET", "messages");
				if (!messages) messages = [];
				if (typeof messages === "string") messages = JSON.parse(messages);

				messages.unshift({
					id: Date.now().toString(),
					nickname: nickname.trim(),
					content: content.trim(),
					recommendUrl: recommendUrl || "",
					time: new Date().toISOString(),
					status: "pending"
				});

				await redisCommand("SET", "messages", JSON.stringify(messages));
				return new Response(JSON.stringify({
					success: true,
					message: "留言成功，等待审核"
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		if (path === "/api/admin/messages" && method === "GET") {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({
					success: false,
					error: "未授权"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			}
			try {
				let messages = await redisCommand("GET", "messages");
				if (!messages) messages = [];
				if (typeof messages === "string") messages = JSON.parse(messages);
				return new Response(JSON.stringify({
					success: true,
					messages
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		if (path.startsWith("/api/admin/messages/") && method === "PUT") {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({
					success: false,
					error: "未授权"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			}
			try {
				const messageId = path.split("/").pop();
				const {
					action
				} = await request.json();

				let messages = await redisCommand("GET", "messages");
				if (typeof messages === "string") messages = JSON.parse(messages);

				const messageIndex = messages.findIndex(m => m.id === messageId);
				if (messageIndex === -1) {
					return new Response(JSON.stringify({
						success: false,
						error: "留言不存在"
					}), {
						status: 404,
						headers: getCorsHeaders(request)
					});
				}

				if (action === "approve") {
					messages[messageIndex].status = "approved";
				} else if (action === "delete") {
					messages.splice(messageIndex, 1);
				}

				await redisCommand("SET", "messages", JSON.stringify(messages));
				return new Response(JSON.stringify({
					success: true,
					message: "操作成功"
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		// ========== 404反馈 API ==========
		// 获取404反馈列表（管理员）
		if (path === "/api/admin/404feedback" && method === "GET") {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({
					success: false,
					error: "未授权"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			}
			try {
				let feedbacks = await redisCommand("GET", "404feedbacks");
				if (!feedbacks) feedbacks = [];
				if (typeof feedbacks === "string") feedbacks = JSON.parse(feedbacks);
				return new Response(JSON.stringify({
					success: true,
					feedbacks
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		// 提交404反馈（公开）
		if (path === "/api/404feedback" && method === "POST") {
			try {
				const {
					brokenUrl,
					message,
					userAgent,
					referer
				} = await request.json();
				if (!brokenUrl) {
					return new Response(JSON.stringify({
						success: false,
						error: "URL不能为空"
					}), {
						status: 400,
						headers: getCorsHeaders(request)
					});
				}

				let feedbacks = await redisCommand("GET", "404feedbacks");
				if (!feedbacks) feedbacks = [];
				if (typeof feedbacks === "string") feedbacks = JSON.parse(feedbacks);

				feedbacks.unshift({
					id: Date.now().toString(),
					brokenUrl: brokenUrl,
					message: message || "",
					userAgent: userAgent || "",
					referer: referer || "",
					time: new Date().toISOString(),
					status: "pending"
				});

				// 只保留最近100条
				if (feedbacks.length > 100) feedbacks = feedbacks.slice(0, 100);

				await redisCommand("SET", "404feedbacks", JSON.stringify(feedbacks));

				// 同时增加404统计计数
				let stats = await redisCommand("GET", "404stats");
				if (!stats) stats = {
					total404: 0,
					today404: 0,
					lastResetDate: new Date().toISOString().split('T')[0]
				};
				if (typeof stats === "string") stats = JSON.parse(stats);

				const today = new Date().toISOString().split('T')[0];
				if (stats.lastResetDate !== today) {
					stats.today404 = 1;
					stats.lastResetDate = today;
				} else {
					stats.today404++;
				}
				stats.total404++;

				await redisCommand("SET", "404stats", JSON.stringify(stats));

				return new Response(JSON.stringify({
					success: true,
					message: "反馈已记录，感谢您的帮助！"
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		// 获取404统计数据
		if (path === "/api/404stats" && method === "GET") {
			try {
				let stats = await redisCommand("GET", "404stats");
				if (!stats) {
					stats = {
						total404: 0,
						today404: 0,
						lastResetDate: new Date().toISOString().split('T')[0]
					};
				}
				if (typeof stats === "string") stats = JSON.parse(stats);
				return new Response(JSON.stringify({
					success: true,
					stats
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}
		// 标记404反馈为已处理
		if (path.startsWith("/api/admin/404feedback/") && method === "PUT") {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({
					success: false,
					error: "未授权"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			}
			try {
				const feedbackId = path.split("/").pop();
				const {
					action
				} = await request.json();

				let feedbacks = await redisCommand("GET", "404feedbacks");
				if (typeof feedbacks === "string") feedbacks = JSON.parse(feedbacks);
				if (!feedbacks) feedbacks = [];

				const feedbackIndex = feedbacks.findIndex(f => f.id === feedbackId);
				if (feedbackIndex === -1) {
					return new Response(JSON.stringify({
						success: false,
						error: "反馈不存在"
					}), {
						status: 404,
						headers: getCorsHeaders(request)
					});
				}

				if (action === "mark") {
					feedbacks[feedbackIndex].status = "handled";
				} else if (action === "delete") {
					feedbacks.splice(feedbackIndex, 1);
				}

				await redisCommand("SET", "404feedbacks", JSON.stringify(feedbacks));
				return new Response(JSON.stringify({
					success: true,
					message: "操作成功"
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		// 删除404反馈（备用）
		if (path.startsWith("/api/admin/404feedback/") && method === "DELETE") {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({
					success: false,
					error: "未授权"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			}
			try {
				const feedbackId = path.split("/").pop();

				let feedbacks = await redisCommand("GET", "404feedbacks");
				if (typeof feedbacks === "string") feedbacks = JSON.parse(feedbacks);
				if (!feedbacks) feedbacks = [];

				const feedbackIndex = feedbacks.findIndex(f => f.id === feedbackId);
				if (feedbackIndex === -1) {
					return new Response(JSON.stringify({
						success: false,
						error: "反馈不存在"
					}), {
						status: 404,
						headers: getCorsHeaders(request)
					});
				}

				feedbacks.splice(feedbackIndex, 1);
				await redisCommand("SET", "404feedbacks", JSON.stringify(feedbacks));
				return new Response(JSON.stringify({
					success: true,
					message: "删除成功"
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}
		// ========== 快捷链接 API ==========

		if (path === "/api/quicklinks" && method === "GET") {
			try {
				let quickLinks = await redisCommand("GET", "quicklinks");
				if (!quickLinks) quickLinks = [];
				if (typeof quickLinks === "string") quickLinks = JSON.parse(quickLinks);
				return new Response(JSON.stringify({
					success: true,
					quickLinks
				}), {
					status: 200,
					headers: {
						...getCorsHeaders(request),
						"Content-Type": "application/json"
					}
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		if (path === "/api/admin/quicklinks" && method === "GET") {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({
					success: false,
					error: "未授权"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			}
			try {
				let quickLinks = await redisCommand("GET", "quicklinks");
				if (!quickLinks) quickLinks = [];
				if (typeof quickLinks === "string") quickLinks = JSON.parse(quickLinks);
				return new Response(JSON.stringify({
					success: true,
					quickLinks
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		if (path === "/api/admin/quicklinks" && method === "PUT") {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({
					success: false,
					error: "未授权"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			}
			try {
				const {
					quickLinks
				} = await request.json();
				await redisCommand("SET", "quicklinks", JSON.stringify(quickLinks || []));
				return new Response(JSON.stringify({
					success: true,
					message: "更新成功"
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		// ========== 网站设置 API ==========

		if (path === "/api/siteinfo" && method === "GET") {
			try {
				let siteInfo = await redisCommand("GET", "siteinfo");
				if (!siteInfo) {
					siteInfo = {
						name: "Arley's | 书签导航",
						description: "自用书签导航站，欢迎使用",
						copyrightYear: "2026",
						copyrightOwner: "ARLEY",
						copyrightUrl: "https://arley.cn",
						poweredName: "ArleyBKS",
						poweredUrl: "https://bm.arley.cn/",
						icpNumber: "20222555"
					};
					await redisCommand("SET", "siteinfo", JSON.stringify(siteInfo));
				}
				if (typeof siteInfo === "string") siteInfo = JSON.parse(siteInfo);
				return new Response(JSON.stringify({
					success: true,
					siteInfo
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		if (path === "/api/admin/siteinfo" && method === "PUT") {
			if (!isAuthorized(request)) {
				return new Response(JSON.stringify({
					success: false,
					error: "未授权"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			}
			try {
				const body = await request.json();
				let siteInfo = await redisCommand("GET", "siteinfo");
				if (siteInfo && typeof siteInfo === "string") siteInfo = JSON.parse(siteInfo);
				if (!siteInfo) siteInfo = {};

				if (body.name !== undefined) siteInfo.name = body.name;
				if (body.description !== undefined) siteInfo.description = body.description;
				if (body.copyrightYear !== undefined) siteInfo.copyrightYear = body.copyrightYear;
				if (body.copyrightOwner !== undefined) siteInfo.copyrightOwner = body.copyrightOwner;
				if (body.copyrightUrl !== undefined) siteInfo.copyrightUrl = body.copyrightUrl;
				if (body.poweredName !== undefined) siteInfo.poweredName = body.poweredName;
				if (body.poweredUrl !== undefined) siteInfo.poweredUrl = body.poweredUrl;
				if (body.icpNumber !== undefined) siteInfo.icpNumber = body.icpNumber;

				await redisCommand("SET", "siteinfo", JSON.stringify(siteInfo));
				return new Response(JSON.stringify({
					success: true,
					message: "更新成功"
				}), {
					status: 200,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		// ========== 登录 API ==========
		if (path === "/api/login" && method === "POST") {
			try {
				const {
					password
				} = await request.json();
				if (password === ADMIN_PASSWORD) {
					return new Response(JSON.stringify({
						success: true,
						token: password
					}), {
						status: 200,
						headers: getCorsHeaders(request)
					});
				}
				return new Response(JSON.stringify({
					success: false,
					error: "密码错误"
				}), {
					status: 401,
					headers: getCorsHeaders(request)
				});
			} catch (err) {
				return new Response(JSON.stringify({
					success: false,
					error: err.message
				}), {
					status: 500,
					headers: getCorsHeaders(request)
				});
			}
		}

		return new Response(JSON.stringify({
			error: "Not Found"
		}), {
			status: 404,
			headers: {
				...getCorsHeaders(request),
				"Content-Type": "application/json"
			}
		});
	},
};