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

  const blob = res?.data;
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
