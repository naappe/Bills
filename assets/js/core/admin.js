(() => {
    'use strict';
    const VERSION = 1;
    
    // ===== CONSTANTS =====
    const ADMIN_ID = '5c0d47f8-68c1-4a60-a1b8-c80885c385da';
    const PRESENCE_INTERVAL = 120000; // 2 mins instead of 1
    const ONLINE_THRESHOLD = 10 * 60 * 1000;
    const MAX_RECORDS = 50; // Limit for safety
    
    // ===== UTILITY HELPERS =====
    const byId = id => document.getElementById(id);
    const moneyValue = v => money(Number(v || 0));
    const rows = () => Array.isArray(state.rows) ? state.rows : [];
    const dateOf = row => {
        try {
            const date = window.dateVal?.(row);
            if (!date) return '-';
            return new Date(date).toISOString().slice(0, 10);
        } catch {
            return '-';
        }
    };
    const amountOf = row => {
        try {
            return Number(window.amountVal?.(row) || 0);
        } catch {
            return 0;
        }
    };
    const vendorOf = row => String(window.vendorVal?.(row) || '').trim();
    const statusOf = row => {
        const status = String(window.statusVal?.(row) || 'Pending').toLowerCase();
        // Normalize status
        return status === 'paid' ? 'Paid' : 'Pending';
    };
    
    // ===== SAFE ESCAPE =====
    const esc = str => {
        if (!str) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(str).replace(/[&<>"']/g, m => map[m]);
    };

    // ===== PAGE HEAD TEMPLATE =====
    const pageHead = (title, subtitle) => `
        <div class="page-head">
            <div>
                <h1>${esc(title)}</h1>
                ${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ''}
            </div>
        </div>
    `;

    // ===== ADMIN CHECK (SAFE) =====
    const isAdmin = () => {
        try {
            return state.role === 'admin' || state.user?.id === ADMIN_ID;
        } catch {
            return false;
        }
    };

    // ===== SAFE DB CALLS WITH RETRY =====
    const safeDbCall = async (promise, fallback = []) => {
        try {
            const result = await promise;
            return result.data || fallback;
        } catch (error) {
            console.warn('DB call failed:', error);
            return fallback;
        }
    };

    // ===== SYNC ROLE WITH BETTER ERROR HANDLING =====
    const syncRole = async () => {
        if (!state.user) return;
        
        try {
            // Admin check first
            if (state.user.id === ADMIN_ID) {
                state.role = 'admin';
                setAdminNav();
                updateRoleDisplay();
                return;
            }

            const { data, error } = await db
                .from('user_roles')
                .select('role, is_active, display_name')
                .eq('user_id', state.user.id)
                .maybeSingle();

            if (error) {
                console.warn('Role sync error:', error);
                // Don't change existing role on error
                return;
            }

            if (data) {
                state.role = data.is_active === false ? 'readonly' : (data.role || 'staff');
                updateRoleDisplay();
            }
        } catch (error) {
            console.warn('Role sync failed:', error);
        } finally {
            setAdminNav();
        }
    };

    // ===== UPDATE ROLE DISPLAY =====
    const updateRoleDisplay = () => {
        try {
            const label = byId('roleLabel');
            if (label) label.textContent = state.role.toUpperCase();
        } catch (e) {
            // Non-critical
        }
    };

    // ===== PRESENCE UPDATE WITH BETTER HANDLING =====
    const updatePresence = async (view = state.view) => {
        if (!state.user) return;
        
        try {
            // Don't update if page is hidden (reduce unnecessary calls)
            if (document.hidden) return;

            await Promise.allSettled([
                db.from('user_presence').upsert({
                    user_id: state.user.id,
                    email: state.user.email,
                    display_name: state.user.user_metadata?.display_name || 
                                 state.user.email?.split('@')[0] || 'User',
                    role: state.role || 'staff',
                    current_view: view || 'dashboard',
                    is_online: true,
                    last_seen_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' }),
                
                db.from('user_roles').update({
                    last_active_at: new Date().toISOString()
                }).eq('user_id', state.user.id)
            ]);
        } catch (error) {
            console.warn('Presence update failed:', error);
            // Don't throw - presence is non-critical
        }
    };

    // ===== SAFE SECTION APPEND =====
    const appendSection = html => {
        try {
            const content = byId('content');
            if (content) content.insertAdjacentHTML('beforeend', html);
        } catch (error) {
            console.warn('Failed to append section:', error);
        }
    };

    // ===== TOP VENDORS WITH LIMIT =====
    const topVendors = () => {
        try {
            const map = new Map();
            rows().forEach(r => {
                const name = vendorOf(r) || 'Unknown';
                map.set(name, (map.get(name) || 0) + amountOf(r));
            });
            return [...map].sort((a, b) => b[1] - a[1]).slice(0, 5);
        } catch {
            return [];
        }
    };

    // ===== LATEST BILLS WITH LIMIT =====
    const latestBills = () => {
        try {
            return [...rows()]
                .sort((a, b) => {
                    const aDate = String(a.created_at || dateOf(a));
                    const bDate = String(b.created_at || dateOf(b));
                    return bDate.localeCompare(aDate);
                })
                .slice(0, 8);
        } catch {
            return [];
        }
    };

    // ===== DASHBOARD RENDER =====
    const originalDashboard = window.renderDashboard;
    window.renderDashboard = () => {
        try {
            originalDashboard?.();
            
            const vendors = topVendors();
            const latest = latestBills();
            
            const allRows = rows();
            const paid = allRows
                .filter(r => statusOf(r).toLowerCase() === 'paid')
                .reduce((s, r) => s + amountOf(r), 0);
            const pending = allRows
                .filter(r => statusOf(r).toLowerCase() !== 'paid')
                .reduce((s, r) => s + amountOf(r), 0);
            
            const latestDate = latest[0] ? dateOf(latest[0]) : '-';
            
            const metricsHTML = `
                <section class="metrics">
                    <article class="metric">
                        <small>Paid value</small>
                        <strong>${moneyValue(paid)}</strong>
                    </article>
                    <article class="metric">
                        <small>Outstanding value</small>
                        <strong>${moneyValue(pending)}</strong>
                    </article>
                    <article class="metric">
                        <small>Latest entry</small>
                        <strong>${esc(latestDate)}</strong>
                    </article>
                    <article class="metric">
                        <small>Active page</small>
                        <strong>Dashboard</strong>
                    </article>
                </section>
            `;
            
            const vendorsHTML = `
                <section class="card">
                    <div class="page-head">
                        <div><h2>Top vendors</h2></div>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr><th>Vendor</th><th>Purchase value</th></tr>
                            </thead>
                            <tbody>
                                ${vendors.length ? vendors.map(v => `
                                    <tr>
                                        <td>${esc(v[0])}</td>
                                        <td>${moneyValue(v[1])}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="2">No data</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </section>
            `;
            
            appendSection(metricsHTML + vendorsHTML);
        } catch (error) {
            console.error('Dashboard render failed:', error);
            // Show fallback
            appendSection(`<section class="card"><div class="empty">Unable to load dashboard</div></section>`);
        }
    };

    // ===== PRODUCTS RENDER =====
    const originalProducts = window.renderProducts;
    window.renderProducts = async () => {
        try {
            const { data = [] } = await safeDbCall(
                db.from('products')
                    .select('id,name,sku,current_rate,is_active,created_at,updated_at')
                    .is('deleted_at', null)
                    .order('updated_at', { ascending: false })
                    .limit(MAX_RECORDS) // Add limit for safety
            );

            const active = data.filter(p => p.is_active !== false);
            const priced = data.filter(p => Number(p.current_rate) > 0);
            const missing = data.length - priced.length;
            const latest = data.slice(0, 10);
            const latestUpdate = latest[0]?.updated_at?.slice(0, 10) || '-';

            const content = byId('content');
            if (!content) return;

            content.innerHTML = pageHead('Products', `${data.length} products`) + `
                <section class="metrics">
                    <article class="metric">
                        <small>Active products</small>
                        <strong>${active.length}</strong>
                    </article>
                    <article class="metric">
                        <small>With current rate</small>
                        <strong>${priced.length}</strong>
                    </article>
                    <article class="metric">
                        <small>Missing rate</small>
                        <strong>${missing}</strong>
                    </article>
                    <article class="metric">
                        <small>Latest update</small>
                        <strong>${esc(latestUpdate)}</strong>
                    </article>
                </section>
                <section class="card">
                    <div class="page-head">
                        <div><h2>Latest products</h2></div>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr><th>Product</th><th>SKU</th><th>Current rate</th><th>Status</th><th>Updated</th></tr>
                            </thead>
                            <tbody>
                                ${latest.length ? latest.map(p => `
                                    <tr>
                                        <td><strong>${esc(p.name)}</strong></td>
                                        <td>${esc(p.sku || '-')}</td>
                                        <td>${moneyValue(p.current_rate)}</td>
                                        <td>${p.is_active === false ? 'Inactive' : 'Active'}</td>
                                        <td>${esc(String(p.updated_at || '').slice(0, 10))}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="5">No products</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </section>
            `;
        } catch (error) {
            console.error('Products render failed:', error);
            const content = byId('content');
            if (content) {
                content.innerHTML = pageHead('Products', 'Unable to load') + 
                    `<section class="card"><div class="empty">Failed to load products. Please refresh.</div></section>`;
            }
        }
    };

    // ===== VENDORS RENDER =====
    const originalVendors = window.renderVendors;
    window.renderVendors = async () => {
        try {
            await originalVendors?.();
            
            const { data = [] } = await safeDbCall(
                db.from('vendors')
                    .select('id,name,tin,phone,email,is_active,created_at,updated_at')
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false })
                    .limit(10)
            );

            const complete = data.filter(v => v.tin && v.phone).length;
            const active = data.filter(v => v.is_active !== false).length;
            const needDetails = data.length - complete;
            const latestDate = data[0]?.created_at?.slice(0, 10) || '-';

            const content = byId('content');
            const first = content?.querySelector('.page-head');
            if (first) {
                first.insertAdjacentHTML('afterend', `
                    <section class="metrics">
                        <article class="metric">
                            <small>Latest added</small>
                            <strong>${esc(latestDate)}</strong>
                        </article>
                        <article class="metric">
                            <small>Complete profiles</small>
                            <strong>${complete}</strong>
                        </article>
                        <article class="metric">
                            <small>Need details</small>
                            <strong>${needDetails}</strong>
                        </article>
                        <article class="metric">
                            <small>Active vendors</small>
                            <strong>${active}</strong>
                        </article>
                    </section>
                `);
            }
        } catch (error) {
            console.warn('Vendors render enhancement failed:', error);
        }
    };

    // ===== PRICES RENDER =====
    const originalPrices = window.renderPrices;
    window.renderPrices = async () => {
        try {
            await originalPrices?.();
            
            const { data = [] } = await safeDbCall(
                db.from('price_history')
                    .select('price,effective_date,created_at')
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false })
                    .limit(100)
            );

            const avg = data.length ? 
                data.reduce((s, p) => s + Number(p.price || 0), 0) / data.length : 
                0;
            
            const latestDate = data[0]?.effective_date || '-';

            const content = byId('content');
            const first = content?.querySelector('.page-head');
            if (first) {
                first.insertAdjacentHTML('afterend', `
                    <section class="metrics">
                        <article class="metric">
                            <small>Recorded prices</small>
                            <strong>${data.length}</strong>
                        </article>
                        <article class="metric">
                            <small>Average rate</small>
                            <strong>${moneyValue(avg)}</strong>
                        </article>
                        <article class="metric">
                            <small>Latest price date</small>
                            <strong>${esc(latestDate)}</strong>
                        </article>
                        <article class="metric">
                            <small>Source</small>
                            <strong>Price history</strong>
                        </article>
                    </section>
                `);
            }
        } catch (error) {
            console.warn('Prices render enhancement failed:', error);
        }
    };

    // ===== REPORTS RENDER =====
    const originalReports = window.renderReports;
    window.renderReports = () => {
        try {
            originalReports?.();
            
            const latest = latestBills();
            
            const reportsHTML = `
                <section class="card">
                    <div class="page-head">
                        <div><h2>Latest activity</h2></div>
                    </div>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr><th>Date</th><th>Vendor</th><th>Status</th><th>Amount</th></tr>
                            </thead>
                            <tbody>
                                ${latest.length ? latest.map(r => `
                                    <tr>
                                        <td>${esc(dateOf(r) || '-')}</td>
                                        <td>${esc(vendorOf(r) || '-')}</td>
                                        <td>${esc(statusOf(r))}</td>
                                        <td>${moneyValue(amountOf(r))}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="4">No activity</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </section>
            `;
            
            appendSection(reportsHTML);
        } catch (error) {
            console.warn('Reports render enhancement failed:', error);
        }
    };

    // ===== ADMIN RENDER WITH SAFETY =====
    window.renderAdmin = async () => {
        try {
            if (!isAdmin()) {
                const content = byId('content');
                if (content) {
                    content.innerHTML = pageHead('Admin', 'Access Denied') + 
                        `<section class="card"><div class="empty">Administrator access required</div></section>`;
                }
                return;
            }

            const content = byId('content');
            if (!content) return;

            content.innerHTML = pageHead('Admin', 'Users, roles and live activity') + 
                '<section class="card"><div class="empty">Loading users…</div></section>';

            const { data, error } = await db.rpc('admin_user_overview');
            
            if (error) {
                content.innerHTML = pageHead('Admin', 'Unable to load users') + 
                    `<section class="card"><div class="empty">${esc(error.message)}</div></section>`;
                return;
            }

            const users = Array.isArray(data) ? data : [];
            const now = Date.now();
            const online = users.filter(u => 
                u.is_online && 
                u.last_seen_at && 
                (now - new Date(u.last_seen_at).getTime()) < ONLINE_THRESHOLD
            ).length;

            const admins = users.filter(u => u.role === 'admin').length;
            const disabled = users.filter(u => u.is_active === false).length;

            content.innerHTML = pageHead('Admin', 'Users, roles and live activity') + `
                <section class="metrics">
                    <article class="metric">
                        <small>Total users</small>
                        <strong>${users.length}</strong>
                    </article>
                    <article class="metric">
                        <small>Online now</small>
                        <strong>${online}</strong>
                    </article>
                    <article class="metric">
                        <small>Admins</small>
                        <strong>${admins}</strong>
                    </article>
                    <article class="metric">
                        <small>Disabled</small>
                        <strong>${disabled}</strong>
                    </article>
                </section>
                <section class="card">
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Current page</th>
                                    <th>Last seen</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(u => `
                                    <tr data-user="${esc(u.user_id)}">
                                        <td>
                                            <strong>${esc(u.display_name || u.email)}</strong>
                                            <div class="muted">${esc(u.email || '')}</div>
                                        </td>
                                        <td>
                                            <select class="field" data-role>
                                                ${['admin','manager','staff','readonly'].map(r => `
                                                    <option ${r === u.role ? 'selected' : ''}>${esc(r)}</option>
                                                `).join('')}
                                            </select>
                                        </td>
                                        <td>
                                            <select class="field" data-active>
                                                <option value="true" ${u.is_active !== false ? 'selected' : ''}>Active</option>
                                                <option value="false" ${u.is_active === false ? 'selected' : ''}>Disabled</option>
                                            </select>
                                        </td>
                                        <td>${esc(u.current_view || '-')}</td>
                                        <td>${u.last_seen_at ? esc(new Date(u.last_seen_at).toLocaleString('en-US')) : '-'}</td>
                                        <td><button class="btn small" data-save-user>Save</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </section>
            `;

            // Safe event binding
            content.querySelectorAll('[data-save-user]').forEach(btn => {
                btn.onclick = async () => {
                    try {
                        const row = btn.closest('[data-user]');
                        if (!row) return;

                        btn.disabled = true;
                        btn.textContent = 'Saving...';

                        const { error } = await db.rpc('admin_update_user_role', {
                            target_user: row.dataset.user,
                            new_role: row.querySelector('[data-role]').value,
                            new_active: row.querySelector('[data-active]').value === 'true',
                            new_display_name: null
                        });

                        btn.disabled = false;
                        
                        if (error) {
                            alert('Update failed: ' + error.message);
                            btn.textContent = 'Retry';
                            return;
                        }

                        btn.textContent = 'Saved ✓';
                        setTimeout(() => {
                            btn.textContent = 'Save';
                        }, 2000);
                    } catch (error) {
                        console.error('User update failed:', error);
                        btn.disabled = false;
                        btn.textContent = 'Failed';
                        setTimeout(() => {
                            btn.textContent = 'Save';
                        }, 2000);
                    }
                };
            });
        } catch (error) {
            console.error('Admin render failed:', error);
            const content = byId('content');
            if (content) {
                content.innerHTML = pageHead('Admin', 'Error') + 
                    `<section class="card"><div class="empty">Failed to load admin panel</div></section>`;
            }
        }
    };

    // ===== SET ADMIN NAV =====
    const setAdminNav = () => {
        try {
            const link = document.querySelector('.nav [data-view="admin"]');
            if (link) {
                link.classList.toggle('hidden', !isAdmin());
            }
        } catch (e) {
            // Non-critical
        }
    };

    // ===== REGISTER RENDERERS =====
    window.__WS_RENDERERS__ = window.__WS_RENDERERS__ || {};
    window.__WS_RENDERERS__.admin = window.renderAdmin;

    // ===== SHOW OVERRIDE =====
    const originalShow = window.show;
    window.show = view => {
        try {
            const result = originalShow(view);
            setAdminNav();
            // Non-blocking presence update
            updatePresence(view).catch(() => {});
            return result;
        } catch (error) {
            console.warn('Show failed:', error);
            return originalShow(view);
        }
    };

    // ===== PERIODIC PRESENCE UPDATE =====
    let presenceInterval = null;
    
    const startPresenceUpdates = () => {
        if (presenceInterval) clearInterval(presenceInterval);
        presenceInterval = setInterval(() => {
            if (!document.hidden) {
                updatePresence(state.view).catch(() => {});
            }
        }, PRESENCE_INTERVAL);
    };

    // ===== VISIBILITY HANDLER =====
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updatePresence(state.view).catch(() => {});
        }
    });

    // ===== INITIALIZATION =====
    const init = async () => {
        try {
            await syncRole();
            await updatePresence(state.view);
            startPresenceUpdates();
            
            if (location.hash === '#admin' && isAdmin()) {
                window.show('admin');
            }
        } catch (error) {
            console.warn('Init failed:', error);
            // Retry after delay
            setTimeout(init, 3000);
        }
    };

    // Start after page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ===== EXPOSE API =====
    window.__WS_ADMIN__ = {
        version: VERSION,
        syncRole,
        updatePresence,
        isAdmin,
        config: {
            presenceInterval: PRESENCE_INTERVAL,
            onlineThreshold: ONLINE_THRESHOLD,
            maxRecords: MAX_RECORDS
        }
    };

})();
