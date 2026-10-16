import { NextRequest, NextResponse } from 'next/server';
import {
  SPRING_TOKEN_COOKIE,
  getServiceSpringToken,
  loginSpring,
  trySpring,
  trySpringGet,
} from '@/lib/api/spring';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';

function springPath(path: string[]) {
  return `/${path.join('/')}`;
}

function isAllowed(path: string) {
  return path.startsWith('/categories/') || path.startsWith('/secondary-categories/');
}

async function springTokenFrom(request: NextRequest) {
  const fromCookie = request.cookies.get(SPRING_TOKEN_COOKIE)?.value;
  if (fromCookie) return fromCookie;
  return getServiceSpringToken();
}

function deniedMessage(method: string) {
  if (method === 'GET') return 'Unable to load catalog data.';
  return 'Catalog create was denied (403). The backend Bearer token is expired. Sign out and sign in with the same email/password the catalog API uses, or set SPRING_AUTH_USERNAME and SPRING_AUTH_PASSWORD in .env.local.';
}

// ─────────────────────────────────────────────────────────────────────────────
// MySQL Direct DB Handlers for Categories
// ─────────────────────────────────────────────────────────────────────────────

async function dbGetAllCategories() {
  const pool = getHomesMerryDbPool();
  const [rows]: any = await pool.query(
    'SELECT pcat_id as primaryCategoryId, pcat_name as primaryCategoryName, pcat_desc as primaryCategoryDescription, image_url as imageUrl, url_slug as slug FROM category ORDER BY pcat_name ASC'
  );
  return rows || [];
}

async function dbGetCategoryById(id: number) {
  const pool = getHomesMerryDbPool();
  const [rows]: any = await pool.query(
    'SELECT pcat_id as primaryCategoryId, pcat_name as primaryCategoryName, pcat_desc as primaryCategoryDescription, image_url as imageUrl, url_slug as slug FROM category WHERE pcat_id = ? LIMIT 1',
    [id]
  );
  return rows?.[0] || null;
}

async function dbCreatePrimaryCategory(body: any) {
  const pool = getHomesMerryDbPool();
  const name = body.primaryCategoryName || body.name || '';
  const desc = body.primaryCategoryDescription || body.description || '';
  const imageUrl = body.imageUrl || '';
  const seo = body.seo || {};
  const pageTitle = seo.page_title || name;
  const metaDesc = seo.meta_desc || desc;
  const urlSlug = seo.url_slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const seoKeywords = JSON.stringify(seo.keywords || body.internalTags || []);
  const internalTags = JSON.stringify(body.internalTags || []);

  const [res]: any = await pool.query(
    `INSERT INTO category (pcat_name, pcat_desc, image_url, page_title, meta_desc, url_slug, seo_keywords, internal_tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, desc, imageUrl, pageTitle, metaDesc, urlSlug, seoKeywords, internalTags]
  );

  return {
    primaryCategoryId: res.insertId,
    primaryCategoryName: name,
    primaryCategoryDescription: desc,
    imageUrl,
    subCategory: [],
    products: []
  };
}

async function dbUpdatePrimaryCategory(id: number, body: any) {
  const pool = getHomesMerryDbPool();
  const name = body.primaryCategoryName || body.name || '';
  const desc = body.primaryCategoryDescription || body.description || '';
  const imageUrl = body.imageUrl || '';
  const seo = body.seo || {};
  const pageTitle = seo.page_title || name;
  const metaDesc = seo.meta_desc || desc;
  const urlSlug = seo.url_slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const seoKeywords = JSON.stringify(seo.keywords || body.internalTags || []);
  const internalTags = JSON.stringify(body.internalTags || []);

  await pool.query(
    `UPDATE category SET pcat_name=?, pcat_desc=?, image_url=?, page_title=?, meta_desc=?, url_slug=?, seo_keywords=?, internal_tags=?
     WHERE pcat_id=?`,
    [name, desc, imageUrl, pageTitle, metaDesc, urlSlug, seoKeywords, internalTags, id]
  );

  return {
    primaryCategoryId: id,
    primaryCategoryName: name,
    primaryCategoryDescription: desc,
    imageUrl
  };
}

async function dbDeletePrimaryCategory(id: number) {
  const pool = getHomesMerryDbPool();
  await pool.query('DELETE FROM category WHERE pcat_id=?', [id]);
  return { message: 'Primary category deleted successfully' };
}

// ─────────────────────────────────────────────────────────────────────────────
// MySQL Direct DB Handlers for Secondary Categories
// ─────────────────────────────────────────────────────────────────────────────

async function dbGetAllSecondaryCategories() {
  const pool = getHomesMerryDbPool();
  const [rows]: any = await pool.query(
    'SELECT scat_id as secondaryCategoryId, scat_name as secondaryCategoryName, scat_desc as secondaryCategoryDescription, primary_category_id as primaryCategoryId, parent_scat_id as parentSecondaryCategoryId, image_url as imageUrl FROM secondary_category ORDER BY scat_name ASC'
  );
  return rows || [];
}

async function dbGetSecondaryCategoriesByPrimary(primaryId: number) {
  const pool = getHomesMerryDbPool();
  const [rows]: any = await pool.query(
    'SELECT scat_id as secondaryCategoryId, scat_name as secondaryCategoryName, scat_desc as secondaryCategoryDescription, primary_category_id as primaryCategoryId, parent_scat_id as parentSecondaryCategoryId, image_url as imageUrl FROM secondary_category WHERE primary_category_id = ? ORDER BY scat_name ASC',
    [primaryId]
  );
  return rows || [];
}

async function dbGetSecondaryCategoryById(id: number) {
  const pool = getHomesMerryDbPool();
  const [rows]: any = await pool.query(
    'SELECT scat_id as secondaryCategoryId, scat_name as secondaryCategoryName, scat_desc as secondaryCategoryDescription, primary_category_id as primaryCategoryId, parent_scat_id as parentSecondaryCategoryId, image_url as imageUrl FROM secondary_category WHERE scat_id = ? LIMIT 1',
    [id]
  );
  return rows?.[0] || null;
}

async function dbCreateSecondaryCategory(primaryId: number, body: any) {
  const pool = getHomesMerryDbPool();
  const name = body.secondaryCategoryName || body.name || '';
  const desc = body.secondaryCategoryDescription || body.description || '';
  const imageUrl = body.imageUrl || '';
  const parentId = body.parentSecondaryId || body.parent_scat_id || null;
  const seo = body.seo || {};
  const pageTitle = seo.page_title || name;
  const metaDesc = seo.meta_desc || desc;
  const urlSlug = seo.url_slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const seoKeywords = JSON.stringify(seo.keywords || body.internalTags || []);
  const internalTags = JSON.stringify(body.internalTags || []);

  const [res]: any = await pool.query(
    `INSERT INTO secondary_category (scat_name, scat_desc, primary_category_id, parent_scat_id, image_url, page_title, meta_desc, url_slug, seo_keywords, internal_tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, desc, primaryId, parentId, imageUrl, pageTitle, metaDesc, urlSlug, seoKeywords, internalTags]
  );

  return {
    secondaryCategoryId: res.insertId,
    secondaryCategoryName: name,
    secondaryCategoryDescription: desc,
    primaryCategoryId: primaryId,
    parentSecondaryCategoryId: parentId,
    imageUrl,
    subCategory: [],
    products: []
  };
}

async function dbCreateSubCategory(parentId: number, body: any) {
  const pool = getHomesMerryDbPool();
  const name = body.secondaryCategoryName || body.name || '';
  const desc = body.secondaryCategoryDescription || body.description || '';
  const imageUrl = body.imageUrl || '';
  const [parents]: any = await pool.query('SELECT primary_category_id FROM secondary_category WHERE scat_id = ? LIMIT 1', [parentId]);
  const primaryId = parents?.[0]?.primary_category_id || null;
  const seo = body.seo || {};
  const pageTitle = seo.page_title || name;
  const metaDesc = seo.meta_desc || desc;
  const urlSlug = seo.url_slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const seoKeywords = JSON.stringify(seo.keywords || body.internalTags || []);
  const internalTags = JSON.stringify(body.internalTags || []);

  const [res]: any = await pool.query(
    `INSERT INTO secondary_category (scat_name, scat_desc, primary_category_id, parent_scat_id, image_url, page_title, meta_desc, url_slug, seo_keywords, internal_tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, desc, primaryId, parentId, imageUrl, pageTitle, metaDesc, urlSlug, seoKeywords, internalTags]
  );

  return {
    secondaryCategoryId: res.insertId,
    secondaryCategoryName: name,
    secondaryCategoryDescription: desc,
    primaryCategoryId: primaryId,
    parentSecondaryCategoryId: parentId,
    imageUrl,
    subCategory: [],
    products: []
  };
}

async function dbUpdateSecondaryCategory(id: number, body: any) {
  const pool = getHomesMerryDbPool();
  const name = body.secondaryCategoryName || body.name || '';
  const desc = body.secondaryCategoryDescription || body.description || '';
  const imageUrl = body.imageUrl || '';
  const seo = body.seo || {};
  const pageTitle = seo.page_title || name;
  const metaDesc = seo.meta_desc || desc;
  const urlSlug = seo.url_slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const seoKeywords = JSON.stringify(seo.keywords || body.internalTags || []);
  const internalTags = JSON.stringify(body.internalTags || []);

  await pool.query(
    `UPDATE secondary_category SET scat_name=?, scat_desc=?, image_url=?, page_title=?, meta_desc=?, url_slug=?, seo_keywords=?, internal_tags=?
     WHERE scat_id=?`,
    [name, desc, imageUrl, pageTitle, metaDesc, urlSlug, seoKeywords, internalTags, id]
  );

  return {
    secondaryCategoryId: id,
    secondaryCategoryName: name,
    secondaryCategoryDescription: desc,
    imageUrl
  };
}

async function dbDeleteSecondaryCategory(id: number) {
  const pool = getHomesMerryDbPool();
  await pool.query('DELETE FROM secondary_category WHERE scat_id=?', [id]);
  return { message: 'Secondary category deleted successfully' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Forwarder with Resilient DB Fallback
// ─────────────────────────────────────────────────────────────────────────────

async function forward(request: NextRequest, path: string[], method: string) {
  const joined = springPath(path);
  if (!isAllowed(joined)) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  let token = await springTokenFrom(request);

  // 1. GET requests: Try Spring first, fallback to MySQL DB
  if (method === 'GET') {
    const result = await trySpringGet(joined, token);
    if (result.ok && result.data && (!Array.isArray(result.data) || result.data.length > 0)) {
      return NextResponse.json(result.data, { status: result.status });
    }

    // Direct DB query fallback
    try {
      if (joined === '/categories/getAllCategories') {
        const rows = await dbGetAllCategories();
        return NextResponse.json(rows, { status: 200 });
      }
      if (joined.startsWith('/categories/getCategory/')) {
        const id = Number(path[2]);
        const cat = await dbGetCategoryById(id);
        return NextResponse.json(cat, { status: cat ? 200 : 404 });
      }
      if (joined === '/secondary-categories/getAllCategories') {
        const rows = await dbGetAllSecondaryCategories();
        return NextResponse.json(rows, { status: 200 });
      }
      if (joined.startsWith('/secondary-categories/getCategoriesByPrimary/')) {
        const id = Number(path[2]);
        const rows = await dbGetSecondaryCategoriesByPrimary(id);
        return NextResponse.json(rows, { status: 200 });
      }
      if (joined.startsWith('/secondary-categories/getCategory/')) {
        const id = Number(path[2]);
        const cat = await dbGetSecondaryCategoryById(id);
        return NextResponse.json(cat, { status: cat ? 200 : 404 });
      }
    } catch (dbErr: any) {
      console.warn('[catalog proxy DB fallback error]', dbErr.message);
    }

    return NextResponse.json(result.data ?? null, { status: result.status });
  }

  // 2. Mutations (POST, PUT, DELETE)
  const payload = method === 'DELETE' ? undefined : await request.json().catch(() => ({}));

  // Try Spring Boot backend
  let result = await trySpring(joined, payload, method, token);
  if (result.status === 403) {
    const user = process.env.SPRING_AUTH_USERNAME || process.env.SPRING_AUTH_EMAIL;
    const pass = process.env.SPRING_AUTH_PASSWORD;
    if (user && pass) {
      const refreshed = await loginSpring(user, pass);
      if (refreshed) {
        token = refreshed;
        result = await trySpring(joined, payload, method, token);
      }
    }
  }

  // If Spring Boot handled successfully, also sync to MySQL if possible
  if (result.ok) {
    try {
      if (joined === '/categories/createCategory') {
        await dbCreatePrimaryCategory(payload);
      } else if (joined.startsWith('/categories/updateCategory/')) {
        await dbUpdatePrimaryCategory(Number(path[2]), payload);
      } else if (joined.startsWith('/categories/deleteCategory/')) {
        await dbDeletePrimaryCategory(Number(path[2]));
      } else if (joined.startsWith('/secondary-categories/createCategory/')) {
        await dbCreateSecondaryCategory(Number(path[2]), payload);
      } else if (joined.startsWith('/secondary-categories/createSubCategory/')) {
        await dbCreateSubCategory(Number(path[2]), payload);
      } else if (joined.startsWith('/secondary-categories/updateCategory/')) {
        await dbUpdateSecondaryCategory(Number(path[2]), payload);
      } else if (joined.startsWith('/secondary-categories/deleteCategory/')) {
        await dbDeleteSecondaryCategory(Number(path[2]));
      }
    } catch {
      // ignore sync errors when Spring already succeeded
    }
    return NextResponse.json(result.data ?? null, { status: result.status });
  }

  // If Spring Boot is down (502 / connection error) or failed, write directly to MySQL database
  try {
    if (joined === '/categories/createCategory' && method === 'POST') {
      const created = await dbCreatePrimaryCategory(payload);
      return NextResponse.json(created, { status: 201 });
    }
    if (joined.startsWith('/categories/updateCategory/') && method === 'PUT') {
      const updated = await dbUpdatePrimaryCategory(Number(path[2]), payload);
      return NextResponse.json(updated, { status: 200 });
    }
    if (joined.startsWith('/categories/deleteCategory/') && method === 'DELETE') {
      const del = await dbDeletePrimaryCategory(Number(path[2]));
      return NextResponse.json(del, { status: 200 });
    }
    if (joined.startsWith('/secondary-categories/createCategory/') && method === 'POST') {
      const created = await dbCreateSecondaryCategory(Number(path[2]), payload);
      return NextResponse.json(created, { status: 201 });
    }
    if (joined.startsWith('/secondary-categories/createSubCategory/') && method === 'POST') {
      const created = await dbCreateSubCategory(Number(path[2]), payload);
      return NextResponse.json(created, { status: 201 });
    }
    if (joined.startsWith('/secondary-categories/updateCategory/') && method === 'PUT') {
      const updated = await dbUpdateSecondaryCategory(Number(path[2]), payload);
      return NextResponse.json(updated, { status: 200 });
    }
    if (joined.startsWith('/secondary-categories/deleteCategory/') && method === 'DELETE') {
      const del = await dbDeleteSecondaryCategory(Number(path[2]));
      return NextResponse.json(del, { status: 200 });
    }
  } catch (dbErr: any) {
    console.error('[catalog proxy DB mutation error]', dbErr);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  if (result.status === 403) {
    return NextResponse.json(
      { message: deniedMessage(method), status: 403 },
      { status: 403 }
    );
  }

  return NextResponse.json(result.data ?? null, { status: result.status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return forward(request, path, 'GET');
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return forward(request, path, 'POST');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return forward(request, path, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return forward(request, path, 'DELETE');
}
