import { Module } from '@nestjs/common';
import { EmployeesModule } from './employees/employees.module';
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
        username: config.getOrThrow<string>('EMPLOYEE_DB_USER'),
        password: config.getOrThrow<string>('EMPLOYEE_DB_PASSWORD'),
        database: config.getOrThrow<string>('EMPLOYEE_DB_NAME'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') === 'development',
        timezone: 'Z',
      }),
    }),
    EmployeesModule,
  ],
})
export class EmployeeModule {}
