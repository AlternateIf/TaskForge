import {
  indexComment,
  indexProject,
  indexTask,
  removeComment,
  removeProject,
  removeTask,
} from '../../services/search.service.js';
import type { TaskForgeMessage } from '../config.js';

interface SearchIndexData {
  entity: string;
  id: string;
  action: 'upsert' | 'delete';
}

export async function searchIndexHandler(message: TaskForgeMessage): Promise<void> {
  const data = message.data as SearchIndexData;
  console.info(`[SearchIndex] Processing ${data.action} for ${data.entity}:${data.id}`);

  if (data.action === 'delete') {
    switch (data.entity) {
      case 'task':
        await removeTask(data.id);
        break;
      case 'project':
        await removeProject(data.id);
        break;
      case 'comment':
        await removeComment(data.id);
        break;
    }
  } else {
    switch (data.entity) {
      case 'task':
        await indexTask(data.id);
        break;
      case 'project':
        await indexProject(data.id);
        break;
      case 'comment':
        await indexComment(data.id);
        break;
    }
  }
}
