import { Module } from '@nestjs/common';
import { AttendanceRecordsModule } from './attendance-records/attendance-records.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.getOrThrow<string>('DB_PORT')),
        username: config.getOrThrow<string>('ATTENDANCE_DB_USER'),
        password: config.getOrThrow<string>('ATTENDANCE_DB_PASSWORD'),
        database: config.getOrThrow<string>('ATTENDANCE_DB_NAME'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') === 'development',
        timezone: 'Z',
      }),
    }),
    AttendanceRecordsModule,
  ],
})
export class AttendanceModule {}
