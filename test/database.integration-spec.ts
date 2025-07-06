import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/modules/database/prisma.service';
import { DatabaseModule } from '../src/modules/database/database.module';
import { ConfigModule } from '@nestjs/config';

describe('Database Integration Tests', () => {
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        DatabaseModule,
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    // Clean up test data
    await prismaService.post.deleteMany();
    await prismaService.user.deleteMany();
  });

  it('should create and retrieve a user', async () => {
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
    };

    const user = await prismaService.user.create({
      data: userData,
    });

    expect(user).toHaveProperty('id');
    expect(user.email).toBe(userData.email);
    expect(user.name).toBe(userData.name);

    const foundUser = await prismaService.user.findUnique({
      where: { id: user.id },
    });

    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe(userData.email);
  });

  it('should create a user with posts', async () => {
    const user = await prismaService.user.create({
      data: {
        email: 'author@example.com',
        name: 'Author',
        posts: {
          create: [
            {
              title: 'First Post',
              content: 'Content of the first post',
              published: true,
            },
            {
              title: 'Second Post',
              content: 'Content of the second post',
              published: false,
            },
          ],
        },
      },
      include: {
        posts: true,
      },
    });

    expect(user.posts).toHaveLength(2);
    expect(user.posts[0].title).toBe('First Post');
    expect(user.posts[1].published).toBe(false);
  });
});