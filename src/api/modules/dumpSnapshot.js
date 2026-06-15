import qs from 'qs';

import request from '../common';

const API_PREFIX = '/stock-api/api/dump-snapshots';

export async function getDumpSnapshotOverview() {
  return await request.get(`${API_PREFIX}/overview`);
}

export async function getDumpSnapshotList(params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(`${API_PREFIX}${query ? `?${query}` : ''}`);
}

export async function getDumpSnapshotExportTasks(params = {}) {
  const query = qs.stringify(params, { skipNulls: true });
  return await request.get(
    `${API_PREFIX}/export-tasks${query ? `?${query}` : ''}`
  );
}

export async function createDumpSnapshotExportTask(data) {
  return await request.post(`${API_PREFIX}/export-tasks`, data);
}

export async function updateDumpSnapshotMetadata(data) {
  return await request.put(`${API_PREFIX}/metadata`, data);
}

export async function uploadDumpSnapshotFile({
  file,
  displayName,
  note,
  tags,
  targetDbName,
}) {
  const formData = new FormData();
  formData.append('file', file);
  if (displayName) {
    formData.append('display_name', displayName);
  }
  if (note) {
    formData.append('note', note);
  }
  if (tags) {
    formData.append('tags', tags);
  }
  if (targetDbName) {
    formData.append('target_db_name', targetDbName);
  }
  return await request.post(`${API_PREFIX}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

export async function restoreDumpSnapshot(data) {
  return await request.post(`${API_PREFIX}/restore`, data);
}

export async function activateDumpSnapshotDatabase(
  relativePath,
  confirmationText
) {
  return await request.post(`${API_PREFIX}/activate`, {
    relative_path: relativePath,
    confirmation_text: confirmationText || null,
  });
}

export async function activateOriginalDatabase(confirmationText) {
  return await request.post(`${API_PREFIX}/activate-original`, {
    confirmation_text: confirmationText || null,
  });
}

async function normalizeDownloadBlob(blob) {
  if (!(blob instanceof Blob)) {
    throw new Error('下载响应不是有效的文件流');
  }

  const contentType = (blob.type || '').toLowerCase();
  if (
    contentType.includes('application/json') ||
    contentType.includes('text/plain') ||
    contentType.includes('text/html') ||
    contentType.includes('application/xml') ||
    contentType.includes('text/xml')
  ) {
    const rawText = (await blob.text()).trim();
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText);
        const message =
          parsed?.detail ||
          parsed?.message ||
          parsed?.error_msg ||
          parsed?.errorMsg;
        if (message) {
          throw new Error(message);
        }
      } catch (error) {
        if (error instanceof Error && error.message !== rawText) {
          throw error;
        }
        const compactText = rawText.replace(/\s+/g, ' ').slice(0, 200);
        throw new Error(`下载接口未返回文件流，实际返回：${compactText}`);
      }
    }
  }

  return blob;
}

export function buildDumpSnapshotDownloadUrl(relativePath) {
  const query = qs.stringify(
    { relative_path: relativePath },
    { skipNulls: true }
  );
  return `${API_PREFIX}/download${query ? `?${query}` : ''}`;
}

export function triggerDumpSnapshotBrowserDownload(relativePath) {
  const url = buildDumpSnapshotDownloadUrl(relativePath);
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadDumpSnapshotBlob(relativePath) {
  const query = qs.stringify(
    { relative_path: relativePath },
    { skipNulls: true }
  );
  const res = await request.get(
    `${API_PREFIX}/download${query ? `?${query}` : ''}`,
    {
      responseType: 'blob',
    }
  );

  const blob = await normalizeDownloadBlob(res?.data);
  const disposition = res?.headers?.['content-disposition'] || '';
  const fileNameMatch = disposition.match(
    /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i
  );
  const resolvedFileName = decodeURIComponent(
    fileNameMatch?.[1] || fileNameMatch?.[2] || ''
  );

  return {
    blob,
    fileName: resolvedFileName || null,
  };
}

export async function deleteDumpSnapshot(relativePath) {
  const query = qs.stringify(
    { relative_path: relativePath },
    { skipNulls: true }
  );
  return await request.delete(`${API_PREFIX}${query ? `?${query}` : ''}`);
}
