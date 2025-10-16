import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const timestamp = searchParams.get('timestamp');

    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const crawledDataDir = path.join(baseDir, 'crawled_data');

    // 디렉토리 존재 확인
    try {
      await fs.access(crawledDataDir);
    } catch {
      return NextResponse.json({ csvFiles: [], jsonFiles: [] });
    }

    // 타임스탬프로 파일 검색
    if (timestamp) {
      const allFiles = await fs.readdir(crawledDataDir);
      console.log(`[CSV API] Searching for timestamp: ${timestamp}`);
      console.log(`[CSV API] All files in directory:`, allFiles);

      const matchingFiles = allFiles.filter(file =>
        (file.endsWith('.json') || file.endsWith('.csv')) &&
        file.includes(timestamp) &&
        file !== 'favorites.json' &&
        !file.includes('crawl_status')
      );

      console.log(`[CSV API] Matching files:`, matchingFiles);

      const fileInfos = await Promise.all(
        matchingFiles.map(async (filename) => {
          const filePath = path.join(crawledDataDir, filename);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8');

          if (filename.endsWith('.json')) {
            const jsonData = JSON.parse(content);
            return {
              filename,
              type: 'json',
              size: stats.size,
              createdAt: stats.mtime.toISOString(),
              data: jsonData,
            };
          } else if (filename.endsWith('.csv')) {
            const lines = content.split('\n').filter(line => line.trim());
            const headers = lines[0] ? lines[0].split(',') : [];
            const dataRows = lines.slice(1).map(line => {
              const values = line.split(',');
              const row: { [key: string]: string } = {};
              headers.forEach((header, index) => {
                row[header.trim()] = values[index]?.trim() || '';
              });
              return row;
            });

            return {
              filename,
              type: 'csv',
              size: stats.size,
              createdAt: stats.mtime.toISOString(),
              headers,
              data: dataRows,
              rowCount: dataRows.length,
            };
          }
        })
      );

      const filteredFiles = fileInfos.filter(f => f !== undefined);
      console.log(`[CSV API] Returning ${filteredFiles.length} files`);

      return NextResponse.json({
        files: filteredFiles
      });
    }

    // 특정 파일 조회
    if (filename) {
      const filePath = path.join(crawledDataDir, filename);

      try {
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');

        if (filename.endsWith('.json')) {
          const jsonData = JSON.parse(content);
          return NextResponse.json({
            file: {
              filename,
              type: 'json',
              size: stats.size,
              createdAt: stats.mtime.toISOString(),
              data: jsonData,
            }
          });
        } else if (filename.endsWith('.csv')) {
          const lines = content.split('\n').filter(line => line.trim());
          const headers = lines[0] ? lines[0].split(',') : [];
          const dataRows = lines.slice(1).map(line => {
            const values = line.split(',');
            const row: { [key: string]: string } = {};
            headers.forEach((header, index) => {
              row[header.trim()] = values[index]?.trim() || '';
            });
            return row;
          });

          return NextResponse.json({
            file: {
              filename,
              type: 'csv',
              size: stats.size,
              createdAt: stats.mtime.toISOString(),
              headers,
              data: dataRows,
              rowCount: dataRows.length,
            }
          });
        }
      } catch (error) {
        return NextResponse.json(
          { error: '파일을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
    }

    // 파일 목록 조회
    const files = await fs.readdir(crawledDataDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'favorites.json');

    // CSV 파일 정보 수집
    const csvFileInfos = await Promise.all(
      csvFiles.map(async (filename) => {
        const filePath = path.join(crawledDataDir, filename);
        const stats = await fs.stat(filePath);

        // CSV 파일 내용 읽기
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        const headers = lines[0] ? lines[0].split(',') : [];
        const dataRows = lines.slice(1).map(line => {
          const values = line.split(',');
          const row: { [key: string]: string } = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
          });
          return row;
        });

        return {
          filename,
          type: 'csv',
          size: stats.size,
          createdAt: stats.mtime.toISOString(),
          headers,
          data: dataRows,
          rowCount: dataRows.length,
        };
      })
    );

    // JSON 파일 정보 수집
    const jsonFileInfos = await Promise.all(
      jsonFiles.map(async (filename) => {
        const filePath = path.join(crawledDataDir, filename);
        const stats = await fs.stat(filePath);

        // JSON 파일 내용 읽기
        const content = await fs.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(content);

        return {
          filename,
          type: 'json',
          size: stats.size,
          createdAt: stats.mtime.toISOString(),
          data: jsonData,
        };
      })
    );

    // 최신 파일순 정렬
    csvFileInfos.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    jsonFileInfos.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ csvFiles: csvFileInfos, jsonFiles: jsonFileInfos });
  } catch (error: any) {
    console.error('Files read error:', error);
    return NextResponse.json(
      { error: '파일을 읽는 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { filename } = await request.json();

    if (!filename || (!filename.endsWith('.csv') && !filename.endsWith('.json'))) {
      return NextResponse.json(
        { error: '유효하지 않은 파일명입니다.' },
        { status: 400 }
      );
    }

    if (filename === 'favorites.json') {
      return NextResponse.json(
        { error: '선호단지 파일은 삭제할 수 없습니다.' },
        { status: 403 }
      );
    }

    const baseDir = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();
    const filePath = path.join(baseDir, 'crawled_data', filename);

    await fs.unlink(filePath);

    return NextResponse.json({ success: true, message: '파일이 삭제되었습니다.' });
  } catch (error: any) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { error: '파일 삭제 중 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
