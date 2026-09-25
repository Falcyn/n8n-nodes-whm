#!/usr/local/cpanel/3rdparty/bin/perl
# ---------------------------------------------------------------------------
# n8n hook bridge for cPanel & WHM
# ---------------------------------------------------------------------------
# A cPanel *Standardized Hooks* script that forwards hook events to an n8n
# "WHM Trigger" webhook.
#
# cPanel runs this script at each registered hook point and passes the event
# as a single JSON document on STDIN:
#
#   { "context": {...}, "data": {...}, "hook": { "category", "event", "stage", ... } }
#
# The script POSTs the event to n8n as JSON, signed with HMAC-SHA256 using the
# shared secret, and ALWAYS reports success back to cPanel so that a slow or
# unreachable n8n can never block account creation or any other action.
#
# Configuration lives in /etc/n8n-whm-hook-bridge.conf (key = value):
#
#   webhook_url = https://n8n.example.com/webhook/<id>/whm   (required)
#   secret      = long-random-string                          (recommended)
#   timeout     = 5                                           (seconds)
#   insecure    = 0                                           (1 = skip TLS verify)
#   redact      = pass,password,passwd,pass1,pass2,key,db_pass,rawpass
#   log         = /usr/local/cpanel/logs/n8n-whm-hook-bridge.log
#
# Register it with the bundled n8n-whm-hooks.sh, or by hand:
#   /usr/local/cpanel/bin/manage_hooks add script /opt/n8n-whm-hook-bridge/n8n-whm-hook-bridge.pl \
#       --manual --category Whostmgr --event Accounts::Create --stage post
# ---------------------------------------------------------------------------
use strict;
use warnings;

use JSON::PP    ();
use HTTP::Tiny  ();
use Digest::SHA qw(hmac_sha256_hex);
use Sys::Hostname qw(hostname);
use POSIX qw(strftime);

my $CONFIG_FILE = $ENV{N8N_WHM_BRIDGE_CONF} || '/etc/n8n-whm-hook-bridge.conf';

# ---- configuration --------------------------------------------------------
my %cfg = (
    webhook_url => '',
    secret      => '',
    timeout     => 5,
    insecure    => 0,
    redact      => 'pass,password,passwd,pass1,pass2,key,db_pass,rawpass,newpass,oldpass',
    log         => '/usr/local/cpanel/logs/n8n-whm-hook-bridge.log',
);

if ( open my $fh, '<', $CONFIG_FILE ) {
    while ( my $line = <$fh> ) {
        chomp $line;
        next if $line =~ /^\s*(#|$)/;
        my ( $k, $v ) = $line =~ /^\s*([A-Za-z_]+)\s*=\s*(.*?)\s*$/ or next;
        $v =~ s/^(['"])(.*)\1$/$2/;
        $cfg{ lc $k } = $v;
    }
    close $fh;
}

sub logmsg {
    my ($msg) = @_;
    return unless $cfg{log};
    if ( open my $lf, '>>', $cfg{log} ) {
        print {$lf} strftime( '%Y-%m-%d %H:%M:%S', localtime ), " [$$] $msg\n";
        close $lf;
    }
    return;
}

# Never block cPanel: every exit path prints a success line to STDOUT.
sub finish {
    my ($msg) = @_;
    print "1 n8n bridge: $msg\n";
    exit 0;
}

# ---- read the hook payload --------------------------------------------------
my $raw = do { local $/; <STDIN> };
$raw = '' unless defined $raw;
$raw =~ s/^\s+|\s+$//g;

my $input;
if ( length $raw ) {
    $input = eval { JSON::PP->new->utf8->decode($raw) };
    if ( !$input || ref $input ne 'HASH' ) {
        logmsg("could not decode hook input: " . ( $@ || 'not a JSON object' ));
        finish('invalid input ignored');
    }
}
else {
    $input = { context => {}, data => {}, hook => {} };
}

unless ( $cfg{webhook_url} && $cfg{webhook_url} =~ m{^https?://}i ) {
    logmsg("webhook_url is not configured in $CONFIG_FILE");
    finish('not configured');
}

# ---- build the event ----------------------------------------------------------
my $hook     = ref $input->{hook} eq 'HASH' ? $input->{hook} : {};
my $category = $hook->{category} // $ENV{HOOK_CATEGORY} // '';
my $event    = $hook->{event}    // $ENV{HOOK_EVENT}    // '';
my $stage    = $hook->{stage}    // $ENV{HOOK_STAGE}    // '';

my %redact = map { lc($_) => 1 } grep { length } split /\s*,\s*/, $cfg{redact};

sub scrub {
    my ($node) = @_;
    if ( ref $node eq 'HASH' ) {
        for my $k ( keys %$node ) {
            if ( $redact{ lc $k } ) { $node->{$k} = '***redacted***'; }
            else                    { scrub( $node->{$k} ); }
        }
    }
    elsif ( ref $node eq 'ARRAY' ) {
        scrub($_) for @$node;
    }
    return;
}
scrub( $input->{data} );
scrub( $input->{context} );

my $payload = {
    event      => join( '::', grep { length } $category, $event ),
    category   => $category,
    name       => $event,
    stage      => $stage,
    hook       => $hook,
    context    => $input->{context} // {},
    data       => $input->{data}    // {},
    hostname   => hostname(),
    timestamp  => strftime( '%Y-%m-%dT%H:%M:%S%z', localtime ),
};

my $body = JSON::PP->new->utf8->canonical->encode($payload);

my %headers = (
    'Content-Type' => 'application/json',
    'User-Agent'   => 'n8n-whm-hook-bridge/1.0',
    'X-WHM-Event'  => $payload->{event},
);
if ( length $cfg{secret} ) {
    $headers{'X-WHM-Signature'} = 'sha256=' . hmac_sha256_hex( $body, $cfg{secret} );
}

# ---- deliver ----------------------------------------------------------------------
my $timeout = ( $cfg{timeout} || 5 ) + 0;
my $ok      = 0;
my $detail  = '';

if ( HTTP::Tiny->can_ssl || $cfg{webhook_url} =~ m{^http://}i ) {
    my $http = HTTP::Tiny->new(
        timeout    => $timeout,
        verify_SSL => $cfg{insecure} ? 0 : 1,
        agent      => 'n8n-whm-hook-bridge/1.0',
    );
    my $res = $http->post( $cfg{webhook_url}, { headers => \%headers, content => $body } );
    $ok     = $res->{success} ? 1 : 0;
    $detail = "$res->{status} $res->{reason}";
    $detail .= ": $res->{content}" if $res->{status} == 599 && defined $res->{content};
}
else {
    # Fallback for a Perl without SSL support: shell out to curl.
    my @cmd = ( 'curl', '-sS', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', $timeout, '-X', 'POST' );
    push @cmd, '-k' if $cfg{insecure};
    push @cmd, '-H', "$_: $headers{$_}" for keys %headers;
    push @cmd, '--data-binary', '@-', $cfg{webhook_url};
    if ( open my $curl, '|-', @cmd ) {    # STDIN of curl
        print {$curl} $body;
        close $curl;
        $ok     = ( $? == 0 ) ? 1 : 0;
        $detail = "curl exit " . ( $? >> 8 );
    }
    else {
        $detail = "could not run curl: $!";
    }
}

if ($ok) {
    logmsg("forwarded $payload->{event} ($stage) -> $cfg{webhook_url}") if $ENV{N8N_WHM_BRIDGE_DEBUG};
    finish("forwarded $payload->{event}");
}
else {
    logmsg("FAILED to forward $payload->{event} ($stage): $detail");
    finish("delivery failed ($detail), ignored");
}
