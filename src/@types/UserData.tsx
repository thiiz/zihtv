export interface IPTVUserData {
    user_info: {
        username: string;
        password: string;
        message: string;
        auth: number;
        status: string;
        exp_date: string;
        is_trial: string;
        active_cons: string;
        created_at: string;
        max_connections: string;
        allowed_output_formats: string[];
    };
    server_info: {
        xui: boolean;
        version: string;
        revision: number;
        url: string;
        port: string;
        https_port: string;
        server_protocol: string;
        rtmp_port: string;
        timestamp_now: number;
        time_now: string;
        timezone: string;
    };
}