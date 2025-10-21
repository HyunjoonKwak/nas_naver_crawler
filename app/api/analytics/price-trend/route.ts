import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const complexNo = searchParams.get('complexNo');
    const tradeType = searchParams.get('tradeType') || 'all';
    const period = parseInt(searchParams.get('period') || '30');

    if (!complexNo) {
      return NextResponse.json({ error: 'complexNo is required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Get complex
    const complex = await prisma.complex.findUnique({
      where: { complexNo },
    });

    if (!complex) {
      return NextResponse.json({ error: 'Complex not found' }, { status: 404 });
    }

    // Get articles within date range
    const articles = await prisma.article.findMany({
      where: {
        complexId: complex.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(tradeType !== 'all' && {
          tradeTypeName: tradeType === 'A1' ? '매매' : tradeType === 'B1' ? '전세' : '월세',
        }),
      },
      select: {
        dealOrWarrantPrc: true,
        createdAt: true,
        tradeTypeName: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by date and calculate statistics
    const dataByDate: Record<string, { prices: number[]; count: number }> = {};

    articles.forEach((article) => {
      const dateKey = article.createdAt.toISOString().split('T')[0];
      if (!dataByDate[dateKey]) {
        dataByDate[dateKey] = { prices: [], count: 0 };
      }
      if (article.dealOrWarrantPrc) {
        // Parse price string (remove commas and convert to number)
        const price = parseFloat(article.dealOrWarrantPrc.replace(/,/g, ''));
        if (!isNaN(price)) {
          dataByDate[dateKey].prices.push(price);
          dataByDate[dateKey].count++;
        }
      }
    });

    // Calculate daily statistics
    const data = Object.entries(dataByDate)
      .map(([date, { prices, count }]) => {
        if (prices.length === 0) return null;

        const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        return {
          date,
          avgPrice: Math.round(avgPrice),
          minPrice: Math.round(minPrice),
          maxPrice: Math.round(maxPrice),
          count,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Fill missing dates with interpolation
    const filledData = [];
    if (data.length > 0) {
      let currentDate = new Date(startDate);
      let dataIndex = 0;

      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];

        if (dataIndex < data.length && data[dataIndex].date === dateKey) {
          filledData.push(data[dataIndex]);
          dataIndex++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return NextResponse.json({
      data: filledData.length > 0 ? filledData : data,
      summary: {
        totalDataPoints: data.length,
        period,
        tradeType,
        complexNo,
        complexName: complex.complexName,
      },
    });
  } catch (error) {
    console.error('Failed to fetch price trend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price trend', data: [] },
      { status: 500 }
    );
  }
}
